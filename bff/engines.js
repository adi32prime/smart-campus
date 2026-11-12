// engines.js
// Helper functions for calling Teams A and B as HTTP services.

const SCHEDULER_URL = process.env.SCHEDULER_URL || 'http://localhost:8090';
const ROUTER_URL    = process.env.ROUTER_URL    || 'http://localhost:8091';

/**
 * Call Team A's OS scheduler to create a booking.
 * POST {SCHEDULER_URL}/schedule
 * Body: { userId, labId, date, startTime, endTime, purpose, priority }
 */
export async function callScheduler({
  userId,
  labId,
  date,
  startTime,
  endTime,
  purpose,
  priority,
}) {
  try {
    const res = await fetch(`${SCHEDULER_URL}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, labId, date, startTime, endTime, purpose, priority }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[engines] Team A responded', res.status, data);
      return { ok: false, error: data.message || `Scheduler returned ${res.status}`, data };
    }
    return { ok: true, data };
  } catch (err) {
    console.error('[engines] Scheduler unreachable:', err.message);
    return { ok: false, error: 'Scheduler unreachable' };
  }
}

/**
 * Call Team A to promote the next waitlisted booking.
 * POST {SCHEDULER_URL}/promote
 * Body: { labId, date, startTime, endTime }
 */
export async function callPromote({ labId, date, startTime, endTime }) {
  try {
    const res = await fetch(`${SCHEDULER_URL}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labId, date, startTime, endTime }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || `Promote returned ${res.status}`, data };
    }
    return { ok: true, data };
  } catch (err) {
    console.error('[engines] Promote unreachable:', err.message);
    return { ok: false, error: 'Promote unreachable' };
  }
}

/**
 * Call Team B's routing engine for a specific route.
 * POST {ROUTER_URL}/route
 */
export async function callRouter({ sourceNodeId, destNodeId }) {
  try {
    const res = await fetch(`${ROUTER_URL}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceNodeId, destNodeId }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[engines] Team B responded', res.status, text);
      return { ok: false, error: `Router returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    console.error('[engines] Router unreachable:', err.message);
    return { ok: false, error: 'Router unreachable' };
  }
}

/**
 * Call Team B's /search endpoint.
 * POST {ROUTER_URL}/search
 * Body: { date, startTime, endTime, resourceType, minCapacity, sourceNodeId }
 */
export async function callSearch({
  date,
  startTime,
  endTime,
  resourceType,
  minCapacity,
  sourceNodeId,
}) {
  try {
    const res = await fetch(`${ROUTER_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, startTime, endTime, resourceType, minCapacity, sourceNodeId }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[engines] Team B search responded', res.status, data);
      return { ok: false, error: data.error || `Search returned ${res.status}`, data };
    }

    // --- CLEANUP: Trust Team B's path, but fix department gaps ---
    if (Array.isArray(data)) {
      const ROOM_TO_DEPT = {
        L1: 'N4', L2: 'N4', L3: 'N4', L4: 'N4', C1: 'N4', C2: 'N4', C3: 'N4', CH1: 'N4',
        EL1: 'N6', EL2: 'N6', EC1: 'N6', EC2: 'N6', EC3: 'N6',
        AL1: 'N7', AL2: 'N7', AL3: 'N7', AC1: 'N7', AC2: 'N7', AC3: 'N7',
        ML1: 'N8', ML2: 'N8', MC1: 'N8', MC2: 'N8'
      };
      
      const SPINE = ['N1', 'N4', 'N6', 'N7', 'N8', 'N2', 'N3', 'N5'];

      data.forEach(item => {
        if (!item.path || !Array.isArray(item.path) || item.path.length === 0) return;
        
        const originalPath = item.path;
        const newPath = [];

        originalPath.forEach((node, i) => {
          const prevNode = newPath[newPath.length - 1];
          
          // If the node is a room, ensure its department comes first
          if (ROOM_TO_DEPT[node] && prevNode !== ROOM_TO_DEPT[node]) {
            const dept = ROOM_TO_DEPT[node];
            // Insert the department right before the room
            if (newPath[newPath.length - 1] !== dept) {
              newPath.push(dept);
            }
            newPath.push(node);
          } else {
            // If it's not a room, just push it
            if (prevNode !== node) {
              newPath.push(node);
            }
          }
        });

        item.path = newPath;
      });
    }

    return { ok: true, data };
  } catch (err) {
    console.error('[engines] Search unreachable:', err.message);
    return { ok: false, error: 'Search unreachable' };
  }
}
/**
 * Map our 6 reason categories to Team A's priority scale.
 * Team A: smaller number = higher priority (1 = highest, 3 = lowest)
 */
export function priorityFromReason(reasonId) {
  switch ((reasonId || '').toLowerCase()) {
    case 'exam':
    case 'workshop':
      return 1;
    case 'practical':
    case 'lecture':
    case 'project':
      return 2;
    case 'meeting':
      return 3;
    default:
      return 2;
  }
}