import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── CONFIG ─────────────────────────────────────────────────────────────────
// After `npm run deploy` in /workers this becomes:
//   wss://digibouquet-rooms.<YOUR_CF_SUBDOMAIN>.workers.dev/room/:roomId
// For local dev run: cd workers && npm run dev
//   → wss://localhost:8787/room/:roomId
export const CF_WORKER_HOST = 'digibouquet-rooms.egreet-in.workers.dev';
export const CF_WORKER_LOCAL = 'localhost:8787'; // wrangler dev default

const STORAGE_PREFIX = 'bouquet_together_';

const DEV_MODE = false; // set true to use localhost:8787

export function usePartyRoom({ roomId, connectionId, onMessage }) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const queueRef = useRef([]);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!roomId || !connectionId || !mountedRef.current) return;
    const host = DEV_MODE ? CF_WORKER_LOCAL : CF_WORKER_HOST;
    const proto = DEV_MODE ? 'ws' : 'wss';
    const url = `${proto}://${host}/room/${roomId}?cid=${encodeURIComponent(connectionId)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      setError(null);
      // Flush queue
      while (queueRef.current.length > 0) {
        const msg = queueRef.current.shift();
        ws.send(msg);
      }
    };

    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(e.data);
        onMessageRef.current?.(msg);
        if (msg.type === 'STATE_SYNC' && msg.state) {
          AsyncStorage.setItem(
            `${STORAGE_PREFIX}${roomId}`,
            JSON.stringify({ state: msg.state, savedAt: Date.now() })
          ).catch(() => {});
        }
      } catch {}
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setError('Connection issue — retrying…');
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      // Auto-reconnect after 2s
      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, 2000);
    };
  }, [roomId, connectionId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    const payload = JSON.stringify({ ...msg, connectionId });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      return true;
    } else {
      queueRef.current.push(payload);
      return false; // Queued
    }
  }, [connectionId]);

  return { connected, error, send };
}

// ── Persistence helpers ────────────────────────────────────────────────────

export async function saveRoomProgress(roomId, data) {
  try {
    await AsyncStorage.setItem(
      `${STORAGE_PREFIX}${roomId}`,
      JSON.stringify({ ...data, savedAt: Date.now() })
    );
  } catch {}
}

export async function loadRoomProgress(roomId) {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${roomId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire after 48 hours
    if (Date.now() - (parsed.savedAt || 0) > 48 * 60 * 60 * 1000) {
      await AsyncStorage.removeItem(`${STORAGE_PREFIX}${roomId}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearRoomProgress(roomId) {
  try {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX}${roomId}`);
  } catch {}
}

export async function getLastRoomId() {
  try {
    return await AsyncStorage.getItem(`${STORAGE_PREFIX}last_room`);
  } catch { return null; }
}

export async function setLastRoomId(roomId) {
  try {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}last_room`, roomId || '');
  } catch {}
}
