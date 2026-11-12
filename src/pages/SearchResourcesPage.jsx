import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  LogOut,
  ChevronRight,
  AlertCircle,
  Loader2,
  MapPin,
  BookOpen,
  X,
  SlidersHorizontal,
  ChevronLeft,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import CampusMap from "../components/CampusMap";
import { CAMPUS_EDGES } from "../data/campusGraph";

const RESOURCE_TYPES = [
  { value: "", label: "Select a type" },
  { value: "Lab", label: "Lab" },
  { value: "Classroom", label: "Classroom" },
  { value: "Conference Hall", label: "Conference Hall" },
];

const BASE_TIME_SLOTS = [
  { start: "09:00", end: "10:00", label: "9:00 AM \u2013 10:00 AM", hour: 9 },
  { start: "10:00", end: "11:00", label: "10:00 AM \u2013 11:00 AM", hour: 10 },
  { start: "11:00", end: "12:00", label: "11:00 AM \u2013 12:00 PM", hour: 11 },
  { start: "12:00", end: "13:00", label: "12:00 PM \u2013 1:00 PM", hour: 12 },
  { start: "13:00", end: "14:00", label: "1:00 PM \u2013 2:00 PM", hour: 13 },
  { start: "14:00", end: "15:00", label: "2:00 PM \u2013 3:00 PM", hour: 14 },
  { start: "15:00", end: "16:00", label: "3:00 PM \u2013 4:00 PM", hour: 15 },
  { start: "16:00", end: "17:00", label: "4:00 PM \u2013 5:00 PM", hour: 16 },
];

const FALLBACK_NODES = [
  { nodeId: "N1", nodeName: "Main Gate" },
  { nodeId: "N3", nodeName: "Library" },
  { nodeId: "N5", nodeName: "Office" },
  { nodeId: "N4", nodeName: "CSE Department" },
];

function pad(n) { return String(n).padStart(2, "0"); }
function toDateString(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function getToday() { return toDateString(new Date()); }
function getMaxDate() { const d = new Date(); d.setDate(d.getDate() + 30); return toDateString(d); }

function getAvailableSlots(dateString) {
  const now = new Date();
  const todayStr = toDateString(now);
  if (dateString !== todayStr) return BASE_TIME_SLOTS;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return BASE_TIME_SLOTS.filter((slot) => {
    if (slot.hour > currentHour) return true;
    if (slot.hour === currentHour && currentMinute === 0) return true;
    return false;
  });
}

function recalculateFromLocalGraph(source, results) {
  const CONNECTIONS = {};
  CAMPUS_EDGES.forEach(edge => {
    if (!CONNECTIONS[edge.from]) CONNECTIONS[edge.from] = [];
    if (!CONNECTIONS[edge.to]) CONNECTIONS[edge.to] = [];
    CONNECTIONS[edge.from].push({ to: edge.to, dist: edge.distance });
    CONNECTIONS[edge.to].push({ to: edge.from, dist: edge.distance });
  });

  function getShortestPath(start, end) {
    if (start === end) return { path: [start], distance: 0 };
    const distances = {};
    const previous = {};
    const queue = [];
    
    Object.keys(CONNECTIONS).forEach(node => { distances[node] = Infinity; });
    distances[start] = 0;
    queue.push({ id: start, dist: 0 });

    while (queue.length > 0) {
      queue.sort((a, b) => a.dist - b.dist);
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

    const path = [];
    let curr = end;
    while (curr) { path.unshift(curr); curr = previous[curr]; }

    return {
      path: distances[end] === Infinity ? [] : path,
      distance: distances[end] === Infinity ? 9999 : distances[end]
    };
  }

  const updated = results.map(r => {
    const result = getShortestPath(source, r.nodeId);
    return { ...r, distance: result.distance, path: result.path };
  });

  return updated.sort((a, b) => a.distance - b.distance);
}

export default function SearchResourcesPage({ user, onLogout }) {
  const navigate = useNavigate();

  const [date, setDate] = useState(getToday());
  const [slotIdx, setSlotIdx] = useState(0);
  const [resourceType, setResourceType] = useState("");
  const [minCapacity, setMinCapacity] = useState(0);
  const [sourceNodeId, setSourceNodeId] = useState("N1");
  const [nodes, setNodes] = useState(FALLBACK_NODES);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const timeSlots = getAvailableSlots(date);
  const slot = timeSlots[slotIdx] || timeSlots[0];
  const debounceRef = useRef(null);

  useEffect(() => {
    if (slotIdx >= timeSlots.length) setSlotIdx(0);
  }, [date, timeSlots.length, slotIdx]);

  useEffect(() => {
    fetch("/api/campus-nodes")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const locations = data.filter(n => {
            const t = String(n.nodeType || '').toLowerCase();
            return ['gate', 'library', 'office', 'department'].includes(t);
          });
          setNodes(locations);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!resourceType) {
      setResults([]);
      setSelectedResource(null);
      setSubmitting(false);
      return;
    }

    if (!slot) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSubmitting(true);
      setError("");

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            startTime: slot.start,
            endTime: slot.end,
            resourceType: resourceType || null,
            minCapacity: Number(minCapacity) || 0,
            sourceNodeId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Search failed");

        const localResults = recalculateFromLocalGraph(sourceNodeId, data);
        
        setResults(localResults);
        if (localResults.length > 0) {
          setSelectedResource(localResults[0]);
        } else {
          setSelectedResource(null);
        }
      } catch (err) {
        setError(err.message || "Search failed");
        setResults([]);
        setSelectedResource(null);
      } finally {
        setSubmitting(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [date, slot?.start, slot?.end, resourceType, minCapacity, sourceNodeId]);

  function handleNodeClick(nodeId) {
    const resource = results.find(r => r.nodeId === nodeId);
    if (resource) setSelectedResource(resource);
  }

  function handleBook() {
    if (!selectedResource) return;
    const params = new URLSearchParams({
      date, startTime: slot.start, endTime: slot.end,
      sourceNodeId: sourceNodeId, fromSearch: "1",
    });
    navigate(`/dashboard/book/${selectedResource.resourceId}?${params.toString()}`);
  }

  const fieldClass =
    "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600";

  const availableNodeIds = results.map(r => r.nodeId);
  const selectedPath = selectedResource?.path || [];

  // --- REUSABLE FORM CONTENT ---
  const FiltersForm = () => (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Date</label>
        <input type="date" value={date} min={getToday()} max={getMaxDate()} onChange={(e) => setDate(e.target.value)} className={fieldClass} required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Time slot</label>
        <select value={slotIdx} onChange={(e) => setSlotIdx(Number(e.target.value))} className={fieldClass} disabled={timeSlots.length === 0}>
          {timeSlots.length === 0 ? <option value="">No slots left</option> : timeSlots.map((s, i) => <option key={s.start} value={i}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Resource type</label>
        <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className={fieldClass}>
          {RESOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Min. capacity</label>
        <input type="number" min={0} value={minCapacity} onChange={(e) => setMinCapacity(e.target.value)} className={fieldClass} />
      </div>
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><MapPin className="h-4 w-4 text-slate-500" /> Your location</label>
        <select value={sourceNodeId} onChange={(e) => setSourceNodeId(e.target.value)} className={fieldClass}>
          {nodes.map((n) => <option key={n.nodeId} value={n.nodeId}>{n.nodeName}</option>)}
        </select>
      </div>

      <div className="mt-2 min-h-[40px]">
        {submitting && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </p>
        )}
        {!submitting && results.length > 0 && (
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            {results.length} {results.length === 1 ? "resource" : "resources"} available
          </p>
        )}
        {!submitting && error && (
          <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden">
      
      {/* Top Nav */}
      <header className="shrink-0 z-30 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">SC</span>
              <span className="hidden text-sm font-semibold sm:block">Smart Campus Lab &amp; Resource Optimizer</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden sm:block rounded-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-1 text-xs">
              <span className="font-medium">{user?.userId}</span>
              {user?.role && <span className="text-slate-500 dark:text-slate-400"> &middot; {user.role}</span>}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Row */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* LEFT SIDEBAR (Desktop) */}
        <aside 
          className={`shrink-0 hidden lg:flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ${
            isSidebarOpen ? "w-[320px]" : "w-0 border-none"
          } overflow-hidden`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filters</h2>
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <FiltersForm />
          </div>
        </aside>

        {/* RIGHT MAP AREA */}
        <main className="flex-1 relative">
          
          {/* Floating Menu Button (when sidebar closed) */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="hidden lg:flex absolute top-4 left-4 z-20 items-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-4 py-2.5 shadow-md hover:shadow-lg transition-shadow"
            >
              <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold">Show Filters</span>
            </button>
          )}

          {/* Mobile Floating Filters Button */}
          <button
            onClick={() => setIsMobileFiltersOpen(true)}
            className="lg:hidden absolute top-4 left-4 z-20 flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-4 py-2.5 shadow-md"
          >
            <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold">Filters</span>
          </button>

          {/* The Map Itself */}
          <CampusMap 
            userNodeId={sourceNodeId}
            selectedNodeId={selectedResource?.nodeId}
            path={selectedPath}
            availableNodeIds={availableNodeIds}
            rankedNodeIds={results.map(r => r.nodeId)}
            onNodeClick={handleNodeClick}
            isSidebarOpen={isSidebarOpen}
            className="w-full h-full !rounded-none !border-none"
          />

          {/* Floating Book Now Pill (Bottom-Right) */}
          {selectedResource && (
            <div className="absolute bottom-6 right-6 z-30">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-2xl">
                <div className="pl-2 pr-4 border-r border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Selected</p>
                  <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedResource.resourceName}
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedResource.distance}m · Cap {selectedResource.capacity}
                  </p>
                </div>
                <button onClick={handleBook} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  <BookOpen className="h-4 w-4" /> Book Now
                </button>
                <button onClick={() => setSelectedResource(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MOBILE FILTERS MODAL */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold">Filters</h2>
            <button onClick={() => setIsMobileFiltersOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <FiltersForm />
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setIsMobileFiltersOpen(false)} 
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Apply & Show Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}