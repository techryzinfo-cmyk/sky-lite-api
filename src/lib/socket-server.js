/**
 * Socket event emitter — calls the standalone Express socket server via HTTP.
 * The Express server holds all WebSocket connections; Next.js just triggers events.
 *
 * Required env vars in backend .env:
 *   SOCKET_SERVER_URL=http://localhost:3001
 *   SOCKET_EMIT_SECRET=pratham-internal-secret
 */

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:3001';
const EMIT_SECRET = process.env.SOCKET_EMIT_SECRET || 'pratham-internal-secret';

/**
 * Emit an event to all clients in a project room.
 * Fire-and-forget — never throws, so CRUD routes don't fail if socket server is down.
 *
 * @param {string} projectId  MongoDB project _id string
 * @param {string} event      e.g. "milestone:created"
 * @param {object} [payload]  extra data sent to clients
 */
export async function emitToProject(projectId, event, payload = {}) {
  try {
    const cleanPayload = payload && typeof payload.toJSON === 'function' ? payload.toJSON() : payload;
    
    await fetch(`${SOCKET_SERVER_URL}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: EMIT_SECRET,
        room: `project:${projectId}`,
        event,
        payload: { projectId, ...cleanPayload },
      }),
    });
  } catch {
    // Socket server being down should never break an API response
  }
}

/**
 * Emit an event to all clients in an org room.
 */
export async function emitToOrg(orgId, event, payload = {}) {
  try {
    const cleanPayload = payload && typeof payload.toJSON === 'function' ? payload.toJSON() : payload;

    await fetch(`${SOCKET_SERVER_URL}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: EMIT_SECRET,
        room: `org:${orgId}`,
        event,
        payload: { orgId, ...cleanPayload },
      }),
    });
  } catch {
    // silent
  }
}
