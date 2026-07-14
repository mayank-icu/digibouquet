/**
 * PartyKit Server — Bouquet Together
 * Handles real-time collaborative bouquet creation rooms.
 *
 * Room state shape:
 * {
 *   phase: 'lobby' | 'select' | 'draw' | 'arrange' | 'message' | 'song' | 'waiting' | 'done',
 *   users: { [connectionId]: { role: 'creator'|'joiner', name: string, ready: boolean } },
 *   userA: { flowers: [], drawing: {strokes:[], tracingFlower: null}, message: '', song: null, submitted: false },
 *   userB: { flowers: [], drawing: {strokes:[], tracingFlower: null}, message: '', song: null, submitted: false },
 *   createdAt: number,
 * }
 */

export default class BouquetTogetherServer {
  constructor(room) {
    this.room = room;
    this.state = null;
  }

  async onStart() {
    // Load persisted state from storage if room already existed
    const stored = await this.room.storage.get('state');
    if (stored) {
      this.state = stored;
    }
  }

  async onConnect(ws, ctx) {
    // Send current state to the newly connected client
    if (this.state) {
      ws.send(JSON.stringify({ type: 'STATE_SYNC', state: this.state }));
    } else {
      ws.send(JSON.stringify({ type: 'STATE_SYNC', state: null }));
    }
  }

  async onMessage(message, ws) {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'CREATE_ROOM': {
        this.state = {
          phase: 'lobby',
          users: {
            [msg.connectionId]: { role: 'creator', name: msg.name || 'User A', ready: false },
          },
          userA: { connectionId: msg.connectionId, flowers: [], drawing: { strokes: [], tracingFlower: null }, message: '', song: null, submitted: false },
          userB: { connectionId: null, flowers: [], drawing: { strokes: [], tracingFlower: null }, message: '', song: null, submitted: false },
          createdAt: Date.now(),
        };
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'JOIN_ROOM': {
        if (!this.state) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
          return;
        }
        if (Object.keys(this.state.users).length >= 2) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full' }));
          return;
        }
        this.state.users[msg.connectionId] = { role: 'joiner', name: msg.name || 'User B', ready: false };
        this.state.userB.connectionId = msg.connectionId;
        this.state.phase = 'select';
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        this._broadcast({ type: 'PARTNER_JOINED', name: msg.name || 'User B' });
        break;
      }

      case 'SELECT_FLOWER': {
        // msg: { connectionId, flower: { id, name, hex, image } }
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        const existing = slot.flowers;
        if (existing.length >= 4) return; // max 4 per user
        if (!existing.find(f => f.id === msg.flower.id)) {
          slot.flowers = [...existing, msg.flower];
        }
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'DESELECT_FLOWER': {
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.flowers = slot.flowers.filter(f => f.id !== msg.flower.id);
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'FLOWERS_CONFIRMED': {
        // Move to draw phase once both have confirmed
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.flowersConfirmed = true;
        const { userA, userB } = this.state;
        if (userA.flowersConfirmed && userB.flowersConfirmed) {
          this.state.phase = 'draw';
        }
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'DRAW_STROKE': {
        // msg: { connectionId, stroke: { points, color, size, tool } }
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.drawing.strokes = [...(slot.drawing.strokes || []), msg.stroke];
        await this._persist();
        // Broadcast stroke immediately for real-time feel (don't wait for full sync)
        this._broadcast({ type: 'STROKE_ADDED', connectionId: msg.connectionId, stroke: msg.stroke });
        await this._persist();
        break;
      }

      case 'UNDO_STROKE': {
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.drawing.strokes = (slot.drawing.strokes || []).slice(0, -1);
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'CLEAR_DRAWING': {
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.drawing.strokes = [];
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'SET_TRACING_FLOWER': {
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.drawing.tracingFlower = msg.flowerId;
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'DRAWING_DONE': {
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.drawingDone = true;
        const { userA, userB } = this.state;
        if (userA.drawingDone && userB.drawingDone) {
          this.state.phase = 'arrange';
        }
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'UPDATE_ARRANGEMENT': {
        // msg: { connectionId, arrangement: [{flowerId, x, y, scale, rotation}] }
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.arrangement = msg.arrangement;
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'ARRANGEMENT_DONE': {
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.arrangementDone = true;
        const { userA, userB } = this.state;
        if (userA.arrangementDone && userB.arrangementDone) {
          this.state.phase = 'message';
        }
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'UPDATE_MESSAGE': {
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.message = msg.message;
        await this._persist();
        // Full STATE_SYNC so both clients see updated message immediately
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'MESSAGE_DONE': {
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.messageDone = true;
        const { userA, userB } = this.state;
        if (userA.messageDone && userB.messageDone) {
          this.state.phase = 'song';
        }
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'SELECT_SONG': {
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.song = msg.song; // { id, title, artist, thumbnail }
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'SONG_DONE': {
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.songDone = true;
        const { userA, userB } = this.state;
        if (userA.songDone && userB.songDone) {
          this.state.phase = 'waiting';
        }
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'FLOWER_DRAWN': {
        // msg: { connectionId, flowerId, drawingUrl }
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        if (!slot.drawnFlowers) slot.drawnFlowers = {};
        slot.drawnFlowers[msg.flowerId] = msg.drawingUrl;
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'SUBMIT': {
        const slot = this._getSlot(msg.connectionId);
        if (!slot) return;
        slot.submitted = true;
        const { userA, userB } = this.state;
        if (userA.submitted && userB.submitted) {
          this.state.phase = 'done';
        } else {
          this.state.phase = 'waiting';
        }
        await this._persist();
        this._broadcast({ type: 'STATE_SYNC', state: this.state });
        break;
      }

      case 'HEARTBEAT': {
        ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK' }));
        break;
      }

      default:
        break;
    }
  }

  async onClose(ws) {
    // Don't delete state — persist it for reconnection
  }

  _getSlot(connectionId) {
    if (!this.state) return null;
    if (this.state.userA?.connectionId === connectionId) return this.state.userA;
    if (this.state.userB?.connectionId === connectionId) return this.state.userB;
    return null;
  }

  _broadcast(msg) {
    this.room.broadcast(JSON.stringify(msg));
  }

  async _persist() {
    this.state.lastActivity = Date.now();
    await this.room.storage.put('state', this.state);
    // Auto-close room after 15 minutes of inactivity
    await this.room.storage.setAlarm(Date.now() + 15 * 60 * 1000);
  }

  async onAlarm() {
    // Room has been inactive for 15 minutes, clean it up
    this.state = null;
    await this.room.storage.delete('state');
    this._broadcast({ type: 'ROOM_CLOSED', message: 'Room closed due to inactivity.' });
  }
}
