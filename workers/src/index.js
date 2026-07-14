/**
 * Cloudflare Worker entry point.
 * Routes WebSocket connections to the BouquetRoom Durable Object.
 *
 * URL pattern: GET /room/:roomId  (with Upgrade: websocket)
 * Health check: GET /health
 */

export { BouquetRoom } from './bouquetRoom.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection',
        },
      });
    }

    // WebSocket room: /room/:roomId
    const match = url.pathname.match(/^\/room\/([a-zA-Z0-9_-]+)$/);
    if (!match) {
      return new Response('Not found. Use /room/:roomId to connect.', { status: 404 });
    }

    const roomId = match[1];

    // Get (or create) the Durable Object for this room
    const id = env.BOUQUET_ROOM.idFromName(roomId);
    const stub = env.BOUQUET_ROOM.get(id);

    // Forward the request to the DO
    return stub.fetch(request);
  },
};
