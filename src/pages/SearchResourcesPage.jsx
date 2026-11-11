import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  LogOut,
  ChevronRight,
  Search,
  AlertCircle,
  Loader2,
  MapPin,
  BookOpen,
  X,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import CampusMap from "../components/CampusMap";

const RESOURCE_TYPES = [
  { value: "", label: "Any type" },
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

export default function SearchResourcesPage({ user, onLogout }) {
  const navigate = useNavigate();

  // Form state
  const [date, setDate] = useState(getToday());
  const [slotIdx, setSlotIdx] = useState(0);
  const [resourceType, setResourceType] = useState("");
  const [minCapacity, setMinCapacity] = useState(0);
  const [sourceNodeId, setSourceNodeId] = useState("N1");
  const [nodes, setNodes] = useState(FALLBACK_NODES);

  // Search/Map state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);

  const timeSlots = getAvailableSlots(date);
  const slot = timeSlots[slotIdx] || timeSlots[0];

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

  async function handleSearch(e) {
    e.preventDefault();
    if (!slot) return;
    setError("");
    setSubmitting(true);
    setSelectedResource(null); // Reset selected node on new search
    setResults([]);

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

      setResults(data);
      setHasSearched(true);
    } catch (err) {
      setError(err.message || "Search failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNodeClick(nodeId) {
    // Find if the clicked node is one of the available results
    const resource = results.find(r => r.nodeId === nodeId);
    if (resource) {
      setSelectedResource(resource);
    }
  }

  function handleBook() {
    if (!selectedResource) return;
    const params = new URLSearchParams({
      date,
      startTime: slot.start,
      endTime: slot.end,
      sourceNodeId: sourceNodeId,
      fromSearch: "1",
    });
    navigate(`/dashboard/book/${selectedResource.resourceId}?${params.toString()}`);
  }

  const fieldClass =
    "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600";

  const availableNodeIds = results.map(r => r.nodeId);
  const selectedPath = selectedResource?.path || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col">
      
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors duration-300">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">SC</span>
            <span className="hidden text-sm font-semibold sm:block">Smart Campus Lab &amp; Resource Optimizer</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="rounded-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-1 text-xs">
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

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 flex flex-col gap-6">
        
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <li><Link to="/dashboard" className="hover:text-indigo-600">Dashboard</Link></li>
            <ChevronRight className="h-4 w-4" />
            <li aria-current="page" className="font-medium text-slate-800 dark:text-slate-200">Search &amp; Map</li>
          </ol>
        </nav>

        {/* TOP FORM RECTANGLE */}
        <form onSubmit={handleSearch} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-700 pt-4">
            <div>
              {hasSearched && !submitting && (
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {results.length} {results.length === 1 ? "resource" : "resources"} available
                </p>
              )}
              {error && (
                <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" /> {error}
                </p>
              )}
            </div>
            <button type="submit" disabled={submitting || timeSlots.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</> : <><Search className="h-4 w-4" /> Search Map</>}
            </button>
          </div>
        </form>

        {/* FULL SCREEN MAP AREA */}
        <div className="flex-1 min-h-[600px] relative rounded-xl shadow-lg overflow-hidden">
          <CampusMap 
            userNodeId={sourceNodeId}
            selectedNodeId={selectedResource?.nodeId}
            path={selectedPath}
            availableNodeIds={availableNodeIds}
            onNodeClick={handleNodeClick}
            className="h-full w-full"
          />
        </div>
      </main>

      {/* FLOATING BOOK BUTTON */}
      {selectedResource && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-2xl">
            <div className="pl-2 pr-4 border-r border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Selected Resource</p>
              <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">{selectedResource.resourceName}</p>
            </div>
            <button onClick={handleBook} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              <BookOpen className="h-4 w-4" /> Book Now
            </button>
            <button onClick={() => setSelectedResource(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}