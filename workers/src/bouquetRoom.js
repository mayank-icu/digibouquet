/* global WebSocketPair */
/**
 * BouquetRoom — Cloudflare Durable Object
 *
 * One instance per room (keyed by roomId).
 * Uses the WebSocket Hibernation API so idle rooms don't cost CPU.
 *
 * Room state shape:
 * {
 *   phase: 'lobby'|'select'|'draw'|'arrange'|'message'|'song'|'waiting'|'done',
 *   userA: { connectionId, flowers, drawing, message, song, submitted, ... },
 *   userB: { connectionId, flowers, drawing, message, song, submitted, ... },
 *   createdAt: number,
 * }
 */
export class BouquetRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // roomState is loaded lazily from durable storage
    this.roomState = null;
    this.loaded = false;
  }

  // ── Load state from storage (once per DO lifetime) ─────────────────────────
  async ensureLoaded() {
    if (this.loaded) return;
    this.roomState = (await this.state.storage.get('roomState')) || null;
    this.loaded = true;

    // Set an alarm for 12 hours from now to clear the room if inactive
    if (!this.roomState || this.roomState.phase !== 'done') {
      const alarmTime = Date.now() + 12 * 60 * 60 * 1000;
      await this.state.storage.setAlarm(alarmTime);
    }
  }

  async alarm() {
    // Room expired, clean it up to save resources
    if (this.roomState && this.roomState.phase !== 'done') {
      this._broadcast({ type: 'ROOM_CLOSED' });
      await this.state.storage.deleteAll();
      this.roomState = null;
      for (const ws of this.state.getWebSockets()) {
        try { ws.close(1000, 'Room expired due to inactivity'); } catch {}
      }
    }
  }

  async persist() {
    await this.state.storage.put('roomState', this.roomState);
  }

  // ── Main fetch handler ─────────────────────────────────────────────────────
  async fetch(request) {
    await this.ensureLoaded();

    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Extract connectionId from query string (?cid=...)
    const url = new URL(request.url);
    const connectionId = url.searchParams.get('cid') || `anon_${Date.now()}`;

    // Create WebSocket pair and use hibernation
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Attach connectionId as a tag for later retrieval
    this.state.acceptWebSocket(server, [connectionId]);

    // Send current state immediately on connect
    const greeting = JSON.stringify({
      type: 'STATE_SYNC',
      state: this.roomState,
    });
    server.send(greeting);

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── WebSocket Hibernation handlers ─────────────────────────────────────────
  async webSocketMessage(ws, rawMessage) {
    await this.ensureLoaded();

    let msg;
    try { msg = JSON.parse(rawMessage); } catch { return; }

    const connectionId = this.state.getTags(ws)[0];

    switch (msg.type) {

      case 'CREATE_ROOM': {
        this.roomState = {
          phase: 'lobby',
          userA: { connectionId, ready: false, flowers: [], drawnFlowers: {}, drawingDone: false, message: '', song: null, submitted: false },
          userB: { connectionId: null, ready: false, flowers: [], drawnFlowers: {}, drawingDone: false, message: '', song: null, submitted: false },
          createdAt: Date.now(),
        };
        await this.persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        break;
      }

      case 'JOIN_ROOM': {
        if (!this.roomState) { ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' })); return; }
        
        // If they are already in the room, just sync and return
        if (this.roomState.userA?.connectionId === connectionId || this.roomState.userB?.connectionId === connectionId) {
          this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
          return;
        }

        const userCount = [this.roomState.userA, this.roomState.userB].filter(u => u?.connectionId).length;
        if (userCount >= 2) { ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full' })); return; }
        this.roomState.userB.connectionId = connectionId;
        this.roomState.userB.ready = false;
        // Keep phase as 'lobby' until both users are ready
        await this.persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        this._broadcast({ type: 'PARTNER_JOINED', name: msg.name || 'Partner' });
        break;
      }

      case 'START_READY': {
        const slot = this._slot(connectionId);
        if (!slot) return;
        slot.ready = true;
        if (this.roomState.userA.ready && this.roomState.userB.ready) {
          this.roomState.phase = 'select';
        }
        await this.persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        break;
      }

      case 'SELECT_FLOWER': {
        const slot = this._slot(connectionId);
        if (!slot || slot.flowers.length >= 4) return;
        const count = slot.flowers.filter(f => f.id === msg.flower?.id).length;
        if (count < 2) {
          slot.flowers = [...slot.flowers, msg.flower];
          await this.persist();
          this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        }
        break;
      }

      case 'DESELECT_FLOWER': {
        const slot = this._slot(connectionId);
        if (!slot) return;
        // Remove only ONE instance of the flower
        const index = slot.flowers.findIndex(f => f.id === msg.flower?.id);
        if (index !== -1) {
          slot.flowers = [...slot.flowers.slice(0, index), ...slot.flowers.slice(index + 1)];
          await this.persist();
          this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        }
        break;
      }

      case 'FLOWERS_CONFIRMED': {
        const slot = this._slot(connectionId);
        if (!slot) return;
        slot.flowersConfirmed = true;
        if (this.roomState.userA.flowersConfirmed && this.roomState.userB.flowersConfirmed) {
          this.roomState.phase = 'draw';
        }
        await this.persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        break;
      }

      case 'FLOWER_DRAWN': {
        const slot = this._slot(connectionId);
        if (!slot) return;
        slot.drawnFlowers = slot.drawnFlowers || {};
        slot.drawnFlowers[msg.flowerId] = msg.drawingUrl;
        await this.persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        break;
      }

      case 'DRAWING_DONE': {
        const slot = this._slot(connectionId);
        if (!slot) return;
        slot.drawingDone = true;
        if (msg.drawingUrl) {
          slot.drawingUrl = msg.drawingUrl;
        }
        if (this.roomState.userA.drawingDone && this.roomState.userB.drawingDone) {
          this.roomState.phase = 'arrange';
        }
        await this.persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        break;
      }

      case 'UPDATE_ARRANGEMENT': {
        const slot = this._slot(connectionId);
        if (!slot) return;
        slot.arrangement = msg.arrangement;
        await this.persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        break;
      }

      case 'ARRANGEMENT_DONE': {
        const slot = this._slot(connectionId);
        if (!slot) return;
        slot.arrangementDone = true;
        if (this.roomState.userA.arrangementDone && this.roomState.userB.arrangementDone) {
          this.roomState.phase = 'message';
        }
        await this.persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        break;
      }

      case 'UPDATE_MESSAGE': {
        const slot = this._slot(connectionId);
        if (!slot) return;
        slot.message = msg.message;
        // Don't full-broadcast message content (privacy); just ack
        await this.persist();
        ws.send(JSON.stringify({ type: 'MESSAGE_SAVED' }));
        break;
      }

      case 'MESSAGE_DONE': {
        const slot = this._slot(connectionId);
        if (!slot) return;
        slot.messageDone = true;
        if (this.roomState.userA.messageDone && this.roomState.userB.messageDone) {
          this.roomState.phase = 'song';
        }
        await this.persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        break;
      }

      case 'SELECT_SONG': {
        const slot = this._slot(connectionId);
        if (!slot) return;
        slot.song = msg.song;
        await this.persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        break;
      }

      case 'SUBMIT': {
        const slot = this._slot(connectionId);
        if (!slot) return;
        slot.submitted = true;
        this.roomState.phase = 'waiting';
        if (this.roomState.userA.submitted && this.roomState.userB.submitted) {
          this.roomState.phase = 'done';
        }
        await this.persist();
        await this.state.storage.deleteAlarm(); // Cancel alarm if done
        this._broadcast({ type: 'STATE_SYNC', state: this.roomState });
        break;
      }

      case 'HEARTBEAT': {
        ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK' }));
        break;
      }

      default: break;
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    // State persists — user can reconnect and resume
    ws.close(code, 'Closing');
  }

  async webSocketError(ws, error) {
    ws.close(1011, 'Internal error');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  _slot(connectionId) {
    if (!this.roomState) return null;
    if (this.roomState.userA?.connectionId === connectionId) return this.roomState.userA;
    if (this.roomState.userB?.connectionId === connectionId) return this.roomState.userB;
    return null;
  }

  _broadcast(msg) {
    const payload = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(payload); } catch {}
    }
  }
}
