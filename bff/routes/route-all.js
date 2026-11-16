import express from 'express';
import { CAMPUS_NODES, CAMPUS_EDGES } from '../../src/data/campusGraph.js';
const router = express.Router();

// POST /api/route-all
// Body: { sourceNodeId, resources: [ { resourceId, nodeId, distance, latency, ... } ] }
router.post('/', (req, res) => {
  const { sourceNodeId, resources } = req.body;

  if (!sourceNodeId || !Array.isArray(resources)) {
    return res.status(400).json({ message: 'sourceNodeId and resources array required' });
  }

  // Build adjacency list
  const CONNECTIONS = {};
CAMPUS_EDGES.forEach(edge => {
      if (!CONNECTIONS[edge.from]) CONNECTIONS[edge.from] = [];
    if (!CONNECTIONS[edge.to]) CONNECTIONS[edge.to] = [];
    CONNECTIONS[edge.from].push({ to: edge.to, dist: edge.distance });
    CONNECTIONS[edge.to].push({ to: edge.from, dist: edge.distance });
  });

  // Dijkstra for a single destination
  function getShortestPath(start, end) {
    if (start === end) return { path: [start], distance: 0 };
    
    const distances = {};
    const previous = {};
    const queue = [];
    
    // Initialize
    Object.keys(CONNECTIONS).forEach(node => { distances[node] = Infinity; });
    distances[start] = 0;
    queue.push({ id: start, dist: 0 });

    while (queue.length > 0) {
      queue.sort((a, b) => a.dist - b.dist); // Simple priority queue
      const current = queue.shift();

      if (current.id === end) break;
      if (current.dist > distances[current.id]) continue;

      const neighbors = CONNECTIONS[current.id] || [];
      for (const neighbor of neighbors) {
        const newDist = current.dist + neighbor.dist;
        if (newDist < distances[neighbor.to]) {
          distances[neighbor.to] = newDist;
          previous[neighbor.to] = current.id;
          queue.push({ id: neighbor.to, dist: newDist });
        }
      }
    }

    // Reconstruct path
    const path = [];
    let curr = end;
    while (curr) {
      path.unshift(curr);
      curr = previous[curr];
    }

    return {
      path: distances[end] === Infinity ? [] : path,
      distance: distances[end] === Infinity ? 9999 : distances[end]
    };
  }

  // Recalculate for every resource
  const updatedResources = resources.map(r => {
    const result = getShortestPath(sourceNodeId, r.nodeId);
    return {
      ...r,
      distance: result.distance,
      path: result.path
    };
  });

  // Sort by new distance
  updatedResources.sort((a, b) => a.distance - b.distance);

  res.json(updatedResources);
});

export default router;
