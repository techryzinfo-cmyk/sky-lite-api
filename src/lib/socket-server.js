const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:3001';
const EMIT_SECRET = process.env.SOCKET_EMIT_SECRET || 'pratham-internal-secret';

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
  }
}

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
  }
}

export async function emitToUser(userId, event, payload = {}) {
  try {
    const cleanPayload = payload && typeof payload.toJSON === 'function' ? payload.toJSON() : payload;

    await fetch(`${SOCKET_SERVER_URL}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: EMIT_SECRET,
        room: `user:${userId}`,
        event,
        payload: { userId, ...cleanPayload },
      }),
    });
  } catch {
  }
}
