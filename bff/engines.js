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

    // --- FINAL ULTIMATE FIX: Pure physical pathfinding ---
    if (Array.isArray(data)) {
      // 1. Map every room to its true physical department
      const ROOM_TO_DEPT = {
        L1: 'N4', L2: 'N4', L3: 'N4', L4: 'N4', C1: 'N4', C2: 'N4', C3: 'N4', CH1: 'N4',
        EL1: 'N6', EL2: 'N6', EC1: 'N6', EC2: 'N6', EC3: 'N6',
        AL1: 'N7', AL2: 'N7', AL3: 'N7', AC1: 'N7', AC2: 'N7', AC3: 'N7',
        ML1: 'N8', ML2: 'N8', MC1: 'N8', MC2: 'N8'
      };
      
      // 2. Define the actual connections based on the visual map (Adjacency List)
      const CONNECTIONS = {
        'N1': ['N4', 'N5'],
        'N2': ['N5', 'N8'],
        'N3': [],
        'N4': ['N1', 'N6'],
        'N5': ['N1', 'N2'],
        'N6': ['N4', 'N7'],
        'N7': ['N6', 'N8'],
        'N8': ['N7', 'N2']
      };

      // 3. BFS to find the shortest path between two nodes
      function findPath(start, end) {
        if (start === end) return [start];
        const queue = [[start]];
        const visited = new Set([start]);

        while (queue.length > 0) {
          const path = queue.shift();
          const node = path[path.length - 1];

          for (const neighbor of (CONNECTIONS[node] || [])) {
            if (neighbor === end) return [...path, neighbor];
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push([...path, neighbor]);
            }
          }
        }
        return [];
      }

      data.forEach(item => {
        const startNode = sourceNodeId || 'N1';
        const destNode = item.nodeId;
        if (!destNode) return;

        const path = [];
        let startDept = ROOM_TO_DEPT[startNode] || startNode;
        let destDept = ROOM_TO_DEPT[destNode] || destNode;

        // Add the starting room
        if (startDept !== startNode) path.push(startNode);
        
        // Find the path between the departments/gates
        const deptPath = findPath(startDept, destDept);
        
        // Combine start room + spine path + dest room
        path.push(...deptPath);
        if (destDept !== destNode) path.push(destNode);

        // Clean up duplicates
        const finalPath = [];
        for (const node of path) {
          if (finalPath[finalPath.length - 1] !== node) finalPath.push(node);
        }

        item.path = finalPath;
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