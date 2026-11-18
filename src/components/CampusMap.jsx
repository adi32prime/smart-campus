import React, { useId, useMemo } from 'react';
import {
  Building2,
  DoorOpen,
  Flag,
  FlaskConical,
  GraduationCap,
  Library as LibraryIcon,
  MapPin,
  Presentation,
  School,
} from 'lucide-react';

import { CAMPUS_NODES as NODES, CAMPUS_EDGES as EDGES } from '../data/campusGraph';

const SPECS = {
  Gate: { w: 130, h: 130 },
  Library: { w: 280, h: 140 },
  Office: { w: 280, h: 140 },
  Department: { w: 320, h: 160 },
  'Conference Hall': { w: 280, h: 110 },
  Lab: { w: 190, h: 80 },
  Classroom: { w: 190, h: 80 },
};
const FALLBACK_SPEC = SPECS.Classroom;

const ICONS = {
  Gate: DoorOpen,
  Library: LibraryIcon,
  Office: Building2,
  Department: GraduationCap,
  Lab: FlaskConical,
  Classroom: School,
  'Conference Hall': Presentation,
};

const ROOM_TYPES = new Set(['Lab', 'Classroom', 'Conference Hall']);
const BUILDING_TYPES = new Set(['Library', 'Office', 'Conference Hall']);

const THEMES = {
  default: {
    shell: 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-600',
    band: 'fill-slate-100 dark:fill-slate-800', accent: 'fill-slate-400 dark:fill-slate-500',
    chip: 'fill-slate-100 dark:fill-slate-800', icon: 'text-slate-600 dark:text-slate-300',
    title: 'fill-slate-800 dark:fill-slate-100', sub: 'fill-slate-400 dark:fill-slate-500',
    dot: 'fill-slate-300 dark:fill-slate-600',
    gateShell: 'fill-slate-900 stroke-slate-700 dark:fill-slate-100 dark:stroke-slate-300',
    gateIcon: 'text-white dark:text-slate-900',
  },
  onPath: {
    shell: 'fill-white stroke-indigo-400 dark:fill-slate-900 dark:stroke-indigo-400',
    band: 'fill-indigo-50 dark:fill-indigo-950/70', accent: 'fill-indigo-400',
    chip: 'fill-indigo-50 dark:fill-indigo-950', icon: 'text-indigo-600 dark:text-indigo-300',
    title: 'fill-slate-800 dark:fill-slate-100', sub: 'fill-indigo-400',
    dot: 'fill-indigo-400',
    gateShell: 'fill-slate-900 stroke-indigo-400 dark:fill-slate-100 dark:stroke-indigo-500',
    gateIcon: 'text-white dark:text-slate-900',
  },
  available: {
    shell: 'fill-green-50 stroke-green-500 dark:fill-green-950/30 dark:stroke-green-500',
    band: 'fill-green-100 dark:fill-green-900/50', accent: 'fill-green-500 dark:fill-green-500',
    chip: 'fill-white dark:fill-green-900/60', icon: 'text-green-600 dark:text-green-400',
    title: 'fill-green-950 dark:fill-green-100', sub: 'fill-green-600 dark:fill-green-300',
    dot: 'fill-green-500',
    gateShell: 'fill-green-500 stroke-green-700 dark:stroke-green-300',
    gateIcon: 'text-white',
  },
  occupied: {
    shell: 'fill-red-50 stroke-red-500 dark:fill-red-950/30 dark:stroke-red-900/60',
    band: 'fill-red-100 dark:fill-red-900/40', accent: 'fill-red-500 dark:fill-red-800',
    chip: 'fill-red-100 dark:fill-red-900/50', icon: 'text-red-500 dark:text-red-400',
    title: 'fill-red-800 dark:fill-red-300', sub: 'fill-red-500 dark:fill-red-400',
    dot: 'fill-red-500 dark:fill-red-400',
    gateShell: 'fill-red-500 stroke-red-700 dark:stroke-red-400',
    gateIcon: 'text-white',
  },
  user: {
    shell: 'fill-amber-50 stroke-amber-600 dark:fill-amber-950/40 dark:stroke-amber-400',
    band: 'fill-amber-100 dark:fill-amber-900/60', accent: 'fill-amber-500',
    chip: 'fill-amber-500', icon: 'text-white',
    title: 'fill-amber-950 dark:fill-amber-50', sub: 'fill-amber-700 dark:fill-amber-300',
    dot: 'fill-amber-500',
    gateShell: 'fill-amber-500 stroke-amber-700 dark:stroke-amber-300',
    gateIcon: 'text-white',
  },
  dest: {
    shell: 'fill-indigo-50 stroke-indigo-600 dark:fill-indigo-950/40 dark:stroke-indigo-400',
    band: 'fill-indigo-100 dark:fill-indigo-900/60', accent: 'fill-indigo-600',
    chip: 'fill-indigo-600', icon: 'text-white',
    title: 'fill-indigo-950 dark:fill-indigo-100', sub: 'fill-indigo-700 dark:fill-indigo-300',
    dot: 'fill-indigo-600',
    gateShell: 'fill-indigo-600 stroke-indigo-800 dark:stroke-indigo-300',
    gateIcon: 'text-white',
  },
};

function route(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  if (!adx || !ady || adx === ady) return [[a.x, a.y], [b.x, b.y]];

  const sx = Math.sign(dx);
  const sy = Math.sign(dy);

  if (a.id === 'N5' && b.id === 'N2') {
    return [[a.x, a.y], [a.x, a.y + 120], [b.x, b.y]];
  }
  if (a.id === 'N2' && b.id === 'N5') {
    return [[a.x, a.y], [b.x, b.y + 120], [b.x, b.y]];
  }
  if (a.id === 'N3' && b.id === 'N2') {
    return [[a.x, a.y], [b.x, a.y], [b.x, b.y]];
  }
  if (a.id === 'N2' && b.id === 'N3') {
    return [[a.x, a.y], [b.x, a.y], [b.x, b.y]];
  }

  if (adx > ady) {
    const s = (adx - ady) / 2;
    return [[a.x, a.y], [a.x + sx * s, a.y], [b.x - sx * s, b.y], [b.x, b.y]];
  }
  const s = (ady - adx) / 2;
  return [[a.x, a.y], [a.x, a.y + sy * s], [b.x, b.y - sy * s], [b.x, b.y]];
}

function roundedPath(points, r = 28) {
  const p = points.filter((q, i) => i === 0 || q[0] !== points[i - 1][0] || q[1] !== points[i - 1][1]);
  if (p.length < 2) return '';
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) {
    const [px, py] = p[i - 1], [cx, cy] = p[i], [nx, ny] = p[i + 1];
    const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const ax = cx + ((px - cx) / l1) * rr, ay = cy + ((py - cy) / l1) * rr;
    const bx = cx + ((nx - cx) / l2) * rr, by = cy + ((ny - cy) / l2) * rr;
    d += ` L${ax} ${ay} Q${cx} ${cy} ${bx} ${by}`;
  }
  const last = p[p.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

function wrap(text, max) {
  const lines = []; let cur = '';
  text.split(' ').forEach((w) => {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= max) cur = next;
    else { if (cur) lines.push(cur); cur = w; }
  });
  if (cur) lines.push(cur);
  if (lines.length > 2) {
    const rest = lines.slice(1).join(' ');
    return [lines[0], rest.length > max ? `${rest.slice(0, max - 1)}…` : rest];
  }
  return lines;
}

const edgeKey = (a, b) => [a, b].sort().join('|');

function PulseRing({ w, h, rx, delay = '0s', className }) {
  const pad = 40;
  return (
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} fill="none" strokeWidth="3" className={className}>
      <animate attributeName="x" values={`${-w / 2};${-w / 2 - pad / 2}`} dur="2.4s" begin={delay} repeatCount="indefinite" />
      <animate attributeName="y" values={`${-h / 2};${-h / 2 - pad / 2}`} dur="2.4s" begin={delay} repeatCount="indefinite" />
      <animate attributeName="width" values={`${w};${w + pad}`} dur="2.4s" begin={delay} repeatCount="indefinite" />
      <animate attributeName="height" values={`${h};${h + pad}`} dur="2.4s" begin={delay} repeatCount="indefinite" />
      <animate attributeName="rx" values={`${rx};${rx + pad / 2}`} dur="2.4s" begin={delay} repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.75;0" dur="2.4s" begin={delay} repeatCount="indefinite" />
    </rect>
  );
}

function Tag({ y, label, Icon, className }) {
  return (
    <g transform={`translate(0 ${y})`} className="pointer-events-none">
      <rect x="-82" y="-15" width="164" height="30" rx="15" className={`${className} stroke-white dark:stroke-slate-950`} strokeWidth="2.5" />
      <path d="M-7 14 L0 23 L7 14 Z" className={className} />
      <Icon x={-70} y={-8} size={16} strokeWidth={2.4} className="text-white" />
      <text x={-46} y="0" dominantBaseline="central" className="fill-white font-mono text-[12px] font-bold tracking-[0.16em]">{label}</text>
    </g>
  );
}

function DistanceBadge({ x, y, distance, active }) {
  const txt = `${distance}m`;
  const w = txt.length * 11 + 26;
  return (
    <g transform={`translate(${x} ${y})`} className="pointer-events-none">
      <rect x={-w / 2 - 12} y="-22" width={w + 24} height="44" rx="22" strokeWidth="2" className={active ? 'fill-indigo-600 stroke-white dark:stroke-slate-950' : 'fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-600'} />
      <text textAnchor="middle" dominantBaseline="central" className={`font-mono text-[22px] font-semibold ${active ? 'fill-white' : 'fill-slate-500 dark:fill-slate-300'}`}>{txt}</text>
    </g>
  );
}

function MapNode({ node, status, theme, uid, availableLabel, onClick, rank, clickableOccupied }) {
  const spec = SPECS[node.type] || FALLBACK_SPEC;
  const Icon = ICONS[node.type] || Building2;
  const { w, h } = spec;
  const hw = w / 2, hh = h / 2;
  const isUser = status === 'user', isDest = status === 'dest';
  const filter = isUser ? `url(#${uid}-glow-g)` : isDest ? `url(#${uid}-glow-i)` : `url(#${uid}-shadow)`;
  const sw = isUser || isDest ? 3.5 : status === 'onPath' ? 3 : 2;
  const clipId = `${uid}-clip-${node.id}`;
  const dim = status === 'occupied' ? 'opacity-60' : '';

  let body;

  if (node.type === 'Gate') {
    const lines = wrap(node.label, 14);
    const labelW = Math.max(...lines.map((l) => l.length)) * 9.5 + 28;
    body = (
      <>
        <rect x={-hw} y={-hh} width={w} height={h} rx="22" strokeWidth={sw} filter={filter} className={theme.gateShell} />
        <rect x={-hw + 7} y={-hh + 7} width={w - 14} height={h - 14} rx="16" fill="none" strokeWidth="1.5" strokeDasharray="4 5" className="stroke-white/40 dark:stroke-slate-900/40" />
        <DoorOpen x={-20} y={-20} size={40} strokeWidth={1.9} className={theme.gateIcon} />
        <rect x={-labelW / 2} y={hh + 10} width={labelW} height="30" rx="15" className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-600" strokeWidth="1.5" />
        <text y={hh + 34} textAnchor="middle" dominantBaseline="central" className={`text-[24px] font-semibold ${theme.title}`}>{lines.join(' ')}</text>
      </>
    );
  } else if (node.type === 'Department') {
    const lines = wrap(node.label, 17);
    const base = lines.length === 1 ? 12 : -2;
    body = (
      <>
        <clipPath id={clipId}><rect x={-hw} y={-hh} width={w} height={h} rx="16" /></clipPath>
        <rect x={-hw} y={-hh} width={w} height={h} rx="16" strokeWidth={sw} filter={filter} className={theme.shell} />
        <g clipPath={`url(#${clipId})`}>
          <rect x={-hw} y={-hh} width={w} height="42" className={theme.band} />
          <rect x={-hw} y={-hh} width={w} height="6" className={theme.accent} />
        </g>
        <Icon x={-hw + 18} y={-hh + 14} size={24} strokeWidth={2.1} className={theme.icon} />
        <text x={-hw + 55} y={-hh + 32} dominantBaseline="central" className={`font-mono text-[14px] font-semibold tracking-[0.24em] ${theme.sub}`}>DEPARTMENT</text>
        {lines.map((l, i) => <text key={l} x={-hw + 22} y={base + i * 30} className={`text-[28px] font-bold tracking-tight ${theme.title}`}>{l}</text>)}
        {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={-hw + 20 + i * 27} y={hh - 24} width="18" height="9" rx="2.5" className={theme.band} />)}
      </>
    );
  } else if (BUILDING_TYPES.has(node.type)) {
    const lines = wrap(node.label, 11);
    const base = lines.length === 1 ? 2 : -8;
    body = (
      <>
        <clipPath id={clipId}><rect x={-hw} y={-hh} width={w} height={h} rx="14" /></clipPath>
        <rect x={-hw} y={-hh} width={w} height={h} rx="14" strokeWidth={sw} filter={filter} className={theme.shell} />
        <g clipPath={`url(#${clipId})`}><rect x={-hw} y={-hh} width="9" height={h} className={theme.accent} /></g>
        <rect x={-hw + 24} y={-26} width="52" height="52" rx="13" className={theme.chip} />
        <Icon x={-hw + 36} y={-14} size={28} strokeWidth={2.1} className={theme.icon} />
        {lines.map((l, i) => <text key={l} x={-hw + 100} y={base + i * 30} dominantBaseline="central" className={`text-[26px] font-bold ${theme.title}`}>{l}</text>)}
        <text x={-hw + 100} y={hh - 22} dominantBaseline="central" className={`font-mono text-[14px] font-semibold uppercase tracking-[0.2em] ${theme.sub}`}>{node.type}</text>
      </>
    );
  } else {
    const lines = wrap(node.label, 10);
    const base = lines.length === 1 ? -3 : -11;
    body = (
      <>
        <rect x={-hw} y={-hh} width={w} height={h} rx="13" strokeWidth={sw} filter={filter} className={theme.shell} />
        <rect x={-hw + 12} y={-24} width="48" height="48" rx="12" className={theme.chip} />
        <Icon x={-hw + 22} y={-14} size={26} strokeWidth={2.1} className={theme.icon} />
        <rect x={hw - 16} y={-hh + 8} width="8" height="8" rx="2" className={theme.dot} />
        {lines.map((l, i) => <text key={l} x={-hw + 66} y={base + i * 22} dominantBaseline="central" className={`text-[20px] font-bold ${theme.title}`}>{l}</text>)}
        {lines.length === 1 && <text x={-hw + 66} y={20} dominantBaseline="central" className={`font-mono text-[13px] font-semibold uppercase tracking-[0.14em] ${theme.sub}`}>{availableLabel}</text>}
      </>
    );
  }

  const ringRx = node.type === 'Gate' ? 22 : node.type === 'Department' ? 16 : 14;
  const isSourceNode = ['Gate', 'Office', 'Library', 'Department'].includes(node.type);
const isClickable = onClick && (
  (ROOM_TYPES.has(node.type) &&
    (status === 'available' || (clickableOccupied && status === 'occupied'))) ||
  isSourceNode
);

  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      className={`${dim} ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={() => { if (isClickable) onClick(node.id); }}
    >
      <title>{`${node.label} · ${node.type}`}</title>

      {rank && status === 'available' && (
        <g transform={`translate(${hw - 16} ${-hh - 16})`}>
          <circle r="22" className="fill-indigo-600 stroke-white dark:stroke-slate-950" strokeWidth="4" />
          <text textAnchor="middle" dominantBaseline="central" className="fill-white font-bold text-[20px]">{rank}</text>
        </g>
      )}

      {isUser && (
        <>
          <PulseRing w={w} h={h} rx={ringRx} className="stroke-amber-500 dark:stroke-amber-400" />
          <PulseRing w={w} h={h} rx={ringRx} delay="1.2s" className="stroke-amber-500 dark:stroke-amber-400" />
        </>
      )}
      {isDest && (
        <rect x={-hw - 9} y={-hh - 9} width={w + 18} height={h + 18} rx={ringRx + 6} fill="none" strokeWidth="2.5" strokeDasharray="10 8" className="stroke-indigo-500 dark:stroke-indigo-400">
          <animate attributeName="stroke-dashoffset" values="36;0" dur="2.4s" repeatCount="indefinite" />
        </rect>
      )}
      {body}
      {isUser && <Tag y={-hh - 32} label="YOU ARE HERE" Icon={MapPin} className="fill-amber-500" />}
      {isDest && !isUser && <Tag y={-hh - 32} label="DESTINATION" Icon={Flag} className="fill-indigo-600" />}
    </g>
  );
}

export default function CampusMap({
  userNodeId,
  selectedNodeId,
  path = [],
  availableNodeIds,
  rankedNodeIds = [],
  className = 'w-full h-auto',
  onNodeClick,
  clickableOccupied = false,
}) {
  const uid = useId().replace(/:/g, '');

  const nodes = useMemo(() => NODES.map((n) => ({ ...n, nodeId: n.id })), []);
  const edges = useMemo(() => EDGES, []);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const available = useMemo(() => (availableNodeIds ? new Set(availableNodeIds) : null), [availableNodeIds]);
  const pathSet = useMemo(() => new Set(path), [path]);

  // View box is computed from the real node positions, so nothing is ever cut off.
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      const s = SPECS[n.type] || FALLBACK_SPEC;
      minX = Math.min(minX, n.x - s.w / 2);
      maxX = Math.max(maxX, n.x + s.w / 2);
      minY = Math.min(minY, n.y - s.h / 2);
      maxY = Math.max(maxY, n.y + s.h / 2);
    });
    if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 3000, h: 1700 };
    const padX = 130;
    const padTop = 120;     // room for "YOU ARE HERE" tag and rank badges
    const padBottom = 200;  // room for legend and title card
    return {
      x: minX - padX,
      y: minY - padTop,
      w: maxX - minX + padX * 2,
      h: maxY - minY + padTop + padBottom,
    };
  }, [nodes]);

  const distanceMap = useMemo(() => {
    const m = new Map();
    edges.forEach((e) => m.set(edgeKey(e.from, e.to), e.distance));
    return m;
  }, [edges]);

  const activeEdges = useMemo(() => {
    const s = new Set();
    for (let i = 0; i < path.length - 1; i++) s.add(edgeKey(path[i], path[i + 1]));
    return s;
  }, [path]);

  const baseEdges = useMemo(
    () =>
      edges.map((e) => {
        const a = nodeMap.get(e.from);
        const b = nodeMap.get(e.to);
        if (!a || !b) return null;

        const points = route(a, b);
        let midX, midY;
        if (points.length >= 3) {
          const middleIndex = Math.floor(points.length / 2);
          midX = points[middleIndex][0];
          midY = points[middleIndex][1];
        } else {
          midX = (a.x + b.x) / 2;
          midY = (a.y + b.y) / 2;
        }

        return {
          key: edgeKey(e.from, e.to),
          d: roundedPath(points),
          mx: midX,
          my: midY,
          span: Math.hypot(a.x - b.x, a.y - b.y),
          distance: e.distance,
        };
      }).filter(Boolean),
    [edges, nodeMap]
  );

  const route$ = useMemo(() => {
    const pts = path.map((id) => nodeMap.get(id)).filter(Boolean);
    if (pts.length < 2) return null;
    let poly = [];
    for (let i = 0; i < pts.length - 1; i++) poly = poly.concat(route(pts[i], pts[i + 1]));
    const total = path.slice(0, -1).reduce((sum, id, i) => sum + (distanceMap.get(edgeKey(id, path[i + 1])) || 0), 0);
    return { d: roundedPath(poly), start: pts[0], end: pts[pts.length - 1], total };
  }, [path, nodeMap, distanceMap]);

  const statusOf = (node) => {
    if (node.id === userNodeId) return 'user';
    if (node.id === selectedNodeId) return 'dest';
    if (ROOM_TYPES.has(node.type) && available) {
      return available.has(node.id) ? 'available' : 'occupied';
    }
    if (pathSet.has(node.id)) return 'onPath';
    return 'default';
  };

  const orderedNodes = useMemo(
    () => [...nodes].sort((a, b) => (SPECS[b.type]?.w || 0) * (SPECS[b.type]?.h || 0) - (SPECS[a.type]?.w || 0) * (SPECS[a.type]?.h || 0)),
    [nodes]
  );

  const { x: bx, y: by, w: bw, h: bh } = bounds;

  return (
    <div className={`relative flex h-full w-full flex-col justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      {/* Whole map shrinks to fit the screen height: no scrolling, no zoom */}
      <div className="relative w-full overflow-hidden">
        <div className="w-full">
            <svg
              viewBox={`${bx} ${by} ${bw} ${bh}`}
              preserveAspectRatio="xMidYMid meet"
              className="block h-auto w-full"
              style={{ maxHeight: 'calc(100vh - 90px)' }}
            >
              <defs>
                <pattern id={`${uid}-minor`} width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" strokeWidth="1" className="stroke-slate-200/70 dark:stroke-slate-800/70" /></pattern>
                <pattern id={`${uid}-major`} width="125" height="125" patternUnits="userSpaceOnUse"><path d="M125 0H0V125" fill="none" strokeWidth="1.5" className="stroke-slate-300/70 dark:stroke-slate-700/60" /></pattern>
                <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#0f172a" floodOpacity="0.16" /></filter>
                <filter id={`${uid}-glow-g`} x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#10b981" floodOpacity="0.55" /></filter>
                <filter id={`${uid}-glow-i`} x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#6366f1" floodOpacity="0.55" /></filter>
                <filter id={`${uid}-blur`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
                {route$ && (
                  <linearGradient id={`${uid}-route`} gradientUnits="userSpaceOnUse" x1={route$.start.x} y1={route$.start.y} x2={route$.end.x} y2={route$.end.y}>
                    <stop offset="0%" stopColor="#f59e0b" /><stop offset="45%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                )}
              </defs>

              <rect x={bx} y={by} width={bw} height={bh} className="fill-slate-50 dark:fill-slate-950" />
              <rect x={bx} y={by} width={bw} height={bh} fill={`url(#${uid}-minor)`} />
              <rect x={bx} y={by} width={bw} height={bh} fill={`url(#${uid}-major)`} />
              <rect x={bx + 14} y={by + 14} width={bw - 28} height={bh - 28} rx="6" fill="none" strokeWidth="2" className="stroke-slate-300 dark:stroke-slate-700" />
              <rect x={bx + 26} y={by + 26} width={bw - 52} height={bh - 52} rx="3" fill="none" strokeWidth="1" strokeDasharray="2 6" className="stroke-slate-300 dark:stroke-slate-700" />

              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                {baseEdges.map((e) => {
                  const active = activeEdges.has(e.key);
                  return (
                    <g key={e.key}>
                      <path d={e.d} strokeWidth="18" className={active ? 'stroke-indigo-100 dark:stroke-indigo-950' : 'stroke-slate-200/90 dark:stroke-slate-800/90'} />
                      <path d={e.d} strokeWidth="2.5" strokeDasharray="3 10" className={active ? 'stroke-indigo-300 dark:stroke-indigo-700' : 'stroke-slate-400 dark:stroke-slate-500'} />
                    </g>
                  );
                })}
              </g>

              {route$ && (
                <g key={path.join('>')} fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d={route$.d} pathLength="1" strokeDasharray="1 1" strokeWidth="30" stroke="#6366f1" opacity="0.4" filter={`url(#${uid}-blur)`}><animate attributeName="stroke-dashoffset" from="1" to="0" dur="0.9s" fill="freeze" /></path>
                  <path d={route$.d} pathLength="1" strokeDasharray="1 1" strokeWidth="15" className="stroke-white dark:stroke-slate-950"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="0.9s" fill="freeze" /></path>
                  <path d={route$.d} pathLength="1" strokeDasharray="1 1" strokeWidth="9" stroke={`url(#${uid}-route)`}><animate attributeName="stroke-dashoffset" from="1" to="0" dur="0.9s" fill="freeze" /></path>
                  <path d={route$.d} strokeWidth="3.5" strokeDasharray="0 26" stroke="#ffffff" opacity="0"><animate attributeName="stroke-dashoffset" values="26;0" dur="1.1s" repeatCount="indefinite" /><animate attributeName="opacity" from="0" to="0.95" begin="0.8s" dur="0.3s" fill="freeze" /></path>
                </g>
              )}

              {orderedNodes.map((node) => {
                const status = statusOf(node);
                const isRoom = ROOM_TYPES.has(node.type);
                const availableLabel = isRoom && available ? (available.has(node.id) ? 'Available' : 'Occupied') : node.type;
                const rankIndex = rankedNodeIds.indexOf(node.id);
                const rank = rankIndex !== -1 ? rankIndex + 1 : null;
                return <MapNode key={node.id} node={node} status={status} theme={THEMES[status]} uid={uid} availableLabel={availableLabel} onClick={onNodeClick} rank={rank} clickableOccupied={clickableOccupied} />;
              })}

              {baseEdges.filter((e) => e.span > 220).map((e) => <DistanceBadge key={e.key} x={e.mx} y={e.my} distance={e.distance} active={activeEdges.has(e.key)} />)}

              {/* Compass: top-right of the view box */}
              <g transform={`translate(${bx + bw - 90} ${by + 90})`} className="pointer-events-none">
                <circle r="28" fill="none" strokeWidth="1.5" className="stroke-slate-300 dark:stroke-slate-600" />
                <path d="M0 -22 L8 9 L0 3 L-8 9 Z" className="fill-slate-700 dark:fill-slate-300" />
                <text y="-36" textAnchor="middle" className="fill-slate-500 font-mono text-[14px] font-bold dark:fill-slate-400">N</text>
              </g>

              {/* Title card: bottom-right */}
              <g transform={`translate(${bx + bw - 44 - 320} ${by + bh - 28 - 68})`} className="pointer-events-none">
                <rect width="320" height="68" rx="10" strokeWidth="1.5" className="fill-white/90 stroke-slate-300 dark:fill-slate-900/90 dark:stroke-slate-700" />
                <rect width="8" height="68" rx="3" className="fill-indigo-500" />
                <text x="26" y="26" className="fill-slate-800 text-[16px] font-bold tracking-[0.2em] dark:fill-slate-100">SMART CAMPUS</text>
                <text x="26" y="49" className="fill-slate-500 font-mono text-[12px] tracking-[0.12em] dark:fill-slate-400">{route$ ? `ROUTE · ${route$.total} m · ${path.length} STOPS` : 'SITE PLAN · SELECT A RESOURCE'}</text>
              </g>

              {/* Legend: bottom-left */}
              <g transform={`translate(${bx + 44} ${by + bh - 28 - 46})`} className="pointer-events-none">
                <rect width="770" height="46" rx="12" strokeWidth="1.5" className="fill-white/90 stroke-slate-300 dark:fill-slate-900/90 dark:stroke-slate-700" />
                {[
                  { x: 20, label: 'You', cls: 'fill-amber-500 stroke-amber-600' },
                  { x: 120, label: 'Destination', cls: 'fill-indigo-600 stroke-indigo-700' },
                  { x: 290, label: 'Available', cls: 'fill-green-100 stroke-green-500 dark:fill-green-900/50 dark:stroke-green-500' },
                  { x: 440, label: 'Occupied', cls: 'fill-red-100 stroke-red-500 dark:fill-red-900/40 dark:stroke-red-900/60' },
                ].map((it) => (
                  <g key={it.label}>
                    <rect x={it.x} y="15" width="24" height="16" rx="4" strokeWidth="1.5" className={it.cls} />
                    <text x={it.x + 34} y="23.5" dominantBaseline="central" className="fill-slate-600 font-mono text-[13px] dark:fill-slate-300">{it.label}</text>
                  </g>
                ))}
                <line x1="590" y1="23" x2="630" y2="23" strokeWidth="2.5" strokeDasharray="3 8" strokeLinecap="round" className="stroke-slate-400 dark:stroke-slate-500" />
                <text x="642" y="23.5" dominantBaseline="central" className="fill-slate-600 font-mono text-[13px] dark:fill-slate-300">Walkway</text>
              </g>
            </svg>
        </div>
      </div>
    </div>
  );
}
