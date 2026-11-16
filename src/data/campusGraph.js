// src/data/campusGraph.js
// Canvas: 3000 x 1700  (set VIEW_W = 3000, VIEW_H = 1700 in CampusMap.jsx)
//
// Node sizes assumed (measured from the rendered map):
//   Department 320x160 | Office/Library 280x140 | Conf. Hall 280x108
//   Lab/Classroom 190x78 | Gate 130x130
//
// Rows:  170 top | 330 Gate 1 | 520 labs | 1020 departments | 1520 classrooms
// Every room is >= 500px above/below its department so the walkway bends
// (where distance badges sit) are 80px+ away from room cards.

export const CAMPUS_NODES = [
  // --- TOP ROW ---
  { id: 'N1', label: 'Main Gate', type: 'Gate', x: 650, y: 170 },
  { id: 'N5', label: 'Office', type: 'Office', x: 1400, y: 170 },
  { id: 'N3', label: 'Library', type: 'Library', x: 2150, y: 170 },

  // --- GATE 1 ---
  { id: 'N2', label: 'Gate 1', type: 'Gate', x: 2720, y: 295 },

  // --- DEPARTMENTS ---
  { id: 'N4', label: 'CSE Department', type: 'Department', x: 650, y: 1020 },
  { id: 'N6', label: 'Electrical Department', type: 'Department', x: 1380, y: 1020 },
  { id: 'N7', label: 'AIML Department', type: 'Department', x: 2080, y: 1020 },
  { id: 'N8', label: 'Mechanical Department', type: 'Department', x: 2720, y: 1020 },

  // --- CSE ROOMS (dept x = 650) ---
  { id: 'L1', label: 'CSE Lab 1', type: 'Lab', x: 310, y: 520 },
  { id: 'L2', label: 'CSE Lab 2', type: 'Lab', x: 525, y: 520 },
  { id: 'L3', label: 'CSE Lab 3', type: 'Lab', x: 775, y: 520 },
  { id: 'L4', label: 'CSE Lab 4', type: 'Lab', x: 990, y: 520 },

  { id: 'CH1', label: 'Conf. Hall', type: 'Conference Hall', x: 190, y: 1020 },
  { id: 'C1', label: 'CSE Class 1', type: 'Classroom', x: 410, y: 1420 },
  { id: 'C2', label: 'CSE Class 2', type: 'Classroom', x: 650, y: 1420 },
  { id: 'C3', label: 'CSE Class 3', type: 'Classroom', x: 890, y: 1420 },

  // --- ELECTRICAL ROOMS (dept x = 1380) ---
  { id: 'EL1', label: 'Elec Lab 1', type: 'Lab', x: 1255, y: 520 },
  { id: 'EL2', label: 'Elec Lab 2', type: 'Lab', x: 1505, y: 520 },

  { id: 'EC1', label: 'Elec Class 1', type: 'Classroom', x: 1160, y: 1420 },
  { id: 'EC2', label: 'Elec Class 2', type: 'Classroom', x: 1380, y: 1420 },
  { id: 'EC3', label: 'Elec Class 3', type: 'Classroom', x: 1600, y: 1420 },

  // --- AIML ROOMS (dept x = 2080) ---
  { id: 'AL1', label: 'AIML Lab 1', type: 'Lab', x: 1860, y: 520 },
  { id: 'AL2', label: 'AIML Lab 2', type: 'Lab', x: 2080, y: 520 },
  { id: 'AL3', label: 'AIML Lab 3', type: 'Lab', x: 2300, y: 520 },

  { id: 'AC1', label: 'AIML Class 1', type: 'Classroom', x: 1860, y: 1420 },
  { id: 'AC2', label: 'AIML Class 2', type: 'Classroom', x: 2080, y: 1420 },
  { id: 'AC3', label: 'AIML Class 3', type: 'Classroom', x: 2300, y: 1420 },

  // --- MECHANICAL ROOMS (dept x = 2720) ---
  { id: 'ML1', label: 'Mech Lab 1', type: 'Lab', x: 2580, y: 520 },
  { id: 'ML2', label: 'Mech Lab 2', type: 'Lab', x: 2860, y: 520 },

  { id: 'MC1', label: 'Mech Class 1', type: 'Classroom', x: 2595, y: 1420 },
  { id: 'MC2', label: 'Mech Class 2', type: 'Classroom', x: 2845, y: 1420 },
];

// --- EDGES UNCHANGED ---
export const CAMPUS_EDGES = [
  { from: 'N1', to: 'N4', distance: 55 },
  { from: 'N1', to: 'N5', distance: 70 },
  { from: 'N5', to: 'N3', distance: 40 },
  { from: 'N3', to: 'N2', distance: 40 },
  { from: 'N2', to: 'N5', distance: 80 },
  { from: 'N4', to: 'N6', distance: 10 },
  { from: 'N6', to: 'N7', distance: 30 },
  { from: 'N7', to: 'N8', distance: 30 },
  { from: 'N8', to: 'N2', distance: 50 },
  { from: 'N4', to: 'L1', distance: 10 },
  { from: 'N4', to: 'L2', distance: 15 },
  { from: 'N4', to: 'L3', distance: 20 },
  { from: 'N4', to: 'L4', distance: 22 },
  { from: 'N4', to: 'C1', distance: 15 },
  { from: 'N4', to: 'C2', distance: 24 },
  { from: 'N4', to: 'C3', distance: 25 },
  { from: 'N4', to: 'CH1', distance: 22 },
  { from: 'N6', to: 'EL1', distance: 20 },
  { from: 'N6', to: 'EL2', distance: 25 },
  { from: 'N6', to: 'EC1', distance: 15 },
  { from: 'N6', to: 'EC2', distance: 18 },
  { from: 'N6', to: 'EC3', distance: 22 },
  { from: 'N7', to: 'AL1', distance: 25 },
  { from: 'N7', to: 'AL2', distance: 30 },
  { from: 'N7', to: 'AL3', distance: 35 },
  { from: 'N7', to: 'AC1', distance: 20 },
  { from: 'N7', to: 'AC2', distance: 22 },
  { from: 'N7', to: 'AC3', distance: 25 },
  { from: 'N8', to: 'ML1', distance: 15 },
  { from: 'N8', to: 'ML2', distance: 18 },
  { from: 'N8', to: 'MC1', distance: 12 },
  { from: 'N8', to: 'MC2', distance: 15 },
];
