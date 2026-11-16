import express from 'express';

const router = express.Router();

// POST /api/route
// Body: { sourceNodeId, destNodeId }
// Calculates the path purely in JS to fix Team B's topology bugs
router.post('/', (req, res) => {
  const { sourceNodeId, destNodeId } = req.body || {};

  if (!sourceNodeId || !destNodeId) {
    return res.status(400).json({ message: 'sourceNodeId and destNodeId are required' });
  }

  // 1. Map every room to its true physical department
  const ROOM_TO_DEPT = {
    L1: 'N4', L2: 'N4', L3: 'N4', L4: 'N4', C1: 'N4', C2: 'N4', C3: 'N4', CH1: 'N4',
    EL1: 'N6', EL2: 'N6', EC1: 'N6', EC2: 'N6', EC3: 'N6',
    AL1: 'N7', AL2: 'N7', AL3: 'N7', AC1: 'N7', AC2: 'N7', AC3: 'N7',
    ML1: 'N8', ML2: 'N8', MC1: 'N8', MC2: 'N8'
  };

  // 2. Define the actual connections (including the fixed Library edges)
  const CONNECTIONS = {
    'N1': ['N4', 'N5'],
    'N2': ['N5', 'N8'],
    'N3': ['N5', 'N2'], // Fixed Library connections
    'N4': ['N1', 'N6'],
    'N5': ['N1', 'N2', 'N3'], // Fixed Office connections
    'N6': ['N4', 'N7'],
    'N7': ['N6', 'N8'],
    'N8': ['N7', 'N2']
  };

  // 3. BFS to find the shortest path
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

  // 4. Build the full path
  const path = [];
  let startDept = ROOM_TO_DEPT[sourceNodeId] || sourceNodeId;
  let destDept = ROOM_TO_DEPT[destNodeId] || destNodeId;

  // Add starting room
  if (startDept !== sourceNodeId) path.push(sourceNodeId);
  
  // Find path between department/gates
  const deptPath = findPath(startDept, destDept);
  
  // Combine start room + spine path + dest room
  path.push(...deptPath);
  if (destDept !== destNodeId) path.push(destNodeId);

  // Clean up duplicates
  const finalPath = [];
  for (const node of path) {
    if (finalPath[finalPath.length - 1] !== node) finalPath.push(node);
  }

  // Return in the same format as Team B so the frontend doesn't break
  res.json({
    found: finalPath.length > 0,
    path: finalPath,
    // Mock the other fields just in case the frontend checks them
    algorithm: "BFS",
    graphVersion: "G-JS",
    edges: [],
    totalDistance: 0,
    totalLatency: 0,
    nodesExplored: finalPath.length
  });
});

export default router;
