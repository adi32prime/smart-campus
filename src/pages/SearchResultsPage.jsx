import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  LogOut,
  ChevronRight,
  AlertCircle,
  FlaskConical,
  GraduationCap,
  Users,
  MapPin,
  Navigation,
  Clock,
  Map as MapIcon,
  X,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import CampusMap from "../components/CampusMap";
import { CAMPUS_EDGES } from "../data/campusGraph";

const TYPE_ICON = {
  Lab: FlaskConical,
  Classroom: GraduationCap,
  "Conference Hall": Users,
};

function loadRequest() {
  try { return JSON.parse(sessionStorage.getItem("sc_search_request") || "null"); } catch { return null; }
}
function loadResults() {
  try {
    const raw = sessionStorage.getItem("sc_search_results");
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function formatDate(dateString) {
  if (!dateString) return "";
  const [y, m, d] = dateString.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// Pure JS Dijkstra to recalculate distances when source changes
function recalculateDistances(newSource, currentResults) {
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
    while (curr) {
      path.unshift(curr);
      curr = previous[curr];
    }

    return {
      path: distances[end] === Infinity ? [] : path,
      distance: distances[end] === Infinity ? 9999 : distances[end]
    };
  }

  const updated = currentResults.map(r => {
    const result = getShortestPath(newSource, r.nodeId);
    return {
      ...r,
      distance: result.distance,
      path: result.path
    };
  });

  return updated.sort((a, b) => a.distance - b.distance);
}

export default function SearchResultsPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [results, setResults] = useState([]);
  
  // State for the map
  const [selectedResource, setSelectedResource] = useState(null);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [currentSource, setCurrentSource] = useState("N1");
  const [allNodes, setAllNodes] = useState([]);

  useEffect(() => {
    const req = loadRequest();
    const res = loadResults();
    setRequest(req);
    setResults(res);
    
    if (res.length > 0) {
      setSelectedResource(res[0]);
    }

    // Handle initial source location
    if (req?.sourceNodeId) {
      setCurrentSource(req.sourceNodeId);
    }

    // Fetch the list of valid locations for the dropdown
    fetch("/api/campus-nodes")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const locations = data.filter(n => {
            const t = String(n.nodeType || '').toLowerCase();
            return ['gate', 'library', 'office', 'department'].includes(t);
          });
          setAllNodes(locations);
        }
      })
      .catch(() => {});
  }, []);

  // Recalculate path & list when source changes
  useEffect(() => {
    if (!results || results.length === 0) return;
    
    const newResults = recalculateDistances(currentSource, results);
    
    // Only update if the distances actually changed to prevent infinite loops
    if (newResults[0]?.distance !== results[0]?.distance) {
      setResults(newResults);
      setSelectedResource(newResults[0]); // Auto-select the new closest resource
      sessionStorage.setItem("sc_search_results", JSON.stringify(newResults));
    }
  }, [currentSource]); // <-- This watches for dropdown changes!

  function handleBook(r) {
    const params = new URLSearchParams({
      date: request.date,
      startTime: request.startTime,
      endTime: request.endTime,
      sourceNodeId: currentSource, // Pass the selected source to the form
      fromSearch: "1",
    });
    navigate(`/dashboard/book/${r.resourceId}?${params.toString()}`);
  }

  const availableNodeIds = results.map(r => r.nodeId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors duration-300">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6">
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

      {/* Main Layout Container */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <li><Link to="/dashboard" className="hover:text-indigo-600">Dashboard</Link></li>
            <ChevronRight className="h-4 w-4" />
            <li><Link to="/dashboard/search" className="hover:text-indigo-600">Search</Link></li>
            <ChevronRight className="h-4 w-4" />
            <li aria-current="page" className="font-medium text-slate-800 dark:text-slate-200">Results</li>
          </ol>
        </nav>

        <div className="mb-6">
          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Search Results</p>
          <h1 className="text-3xl font-bold">{results.length} resource{results.length === 1 ? "" : "s"} available</h1>
          {request && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDate(request.date)} · {formatTime(request.startTime)} – {formatTime(request.endTime)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                From {currentSource}
              </span>
            </p>
          )}
        </div>

        {/* SPLIT LAYOUT: 1/3 List, 2/3 Map */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* LEFT COLUMN: Resources List (Scrollable) */}
          <div className="lg:col-span-1 h-[calc(100vh-250px)] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {results.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-12 text-center">
                <AlertCircle className="mb-3 h-8 w-8 text-slate-400" />
                <p className="text-base font-semibold">No resources matched</p>
                <button
                  onClick={() => navigate("/dashboard/search")}
                  className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Modify search
                </button>
              </div>
            ) : (
              results.map((r, index) => {
                const Icon = TYPE_ICON[r.typeName] || FlaskConical;
                const isSelected = selectedResource?.resourceId === r.resourceId;
                
                return (
                  <div
                    key={r.resourceId}
                    className={`flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 ${
                      isSelected 
                        ? "border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-900/20 shadow-md ring-1 ring-indigo-500" 
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-base font-semibold">{r.resourceName}</p>
                          {index === 0 && (
                             <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Top Pick</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {r.departmentName} · {r.typeName} · Capacity {r.capacity}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg">
                      <Navigation className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="truncate">via {(r.path || []).join(" → ")}</span>
                      <span className="ml-auto font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{r.distance} m</span>
                    </div>

                    {/* Track & Book Buttons */}
                    <div className="mt-1 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedResource(r);
                          if (window.innerWidth < 1024) setShowMobileMap(true);
                        }}
                        className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          isSelected 
                            ? "border-indigo-600 bg-indigo-600 text-white" 
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                        }`}
                      >
                        {isSelected ? "Tracking" : "Track Path"}
                      </button>
                      <button
                        onClick={() => handleBook(r)}
                        className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT COLUMN: Map (2/3 width) - Sticky on Desktop */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="sticky top-24 h-[calc(100vh-250px)] flex flex-col gap-3">
              
              {/* Change Source Location */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Starting from:</span>
                <select
                  value={currentSource}
                  onChange={(e) => setCurrentSource(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  {allNodes.map(n => (
                    <option key={n.nodeId} value={n.nodeId}>{n.nodeName}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 shadow-lg rounded-xl overflow-hidden">
                <CampusMap 
                  userNodeId={currentSource}
                  selectedNodeId={selectedResource?.nodeId}
                  path={selectedResource?.path || []}
                  availableNodeIds={availableNodeIds}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE FLOATING BUTTON */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 lg:hidden">
        <button
          onClick={() => setShowMobileMap(true)}
          className="flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <MapIcon className="h-5 w-5" />
          View Map
        </button>
      </div>

      {/* MOBILE FULL SCREEN MAP MODAL */}
      {showMobileMap && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-900 lg:hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Route Map</h2>
            <button
              onClick={() => setShowMobileMap(false)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Mobile Source Dropdown */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Starting from:</span>
            <select
              value={currentSource}
              onChange={(e) => setCurrentSource(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              {allNodes.map(n => (
                <option key={n.nodeId} value={n.nodeId}>{n.nodeName}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 p-4">
            <CampusMap 
              userNodeId={currentSource}
              selectedNodeId={selectedResource?.nodeId}
              path={selectedResource?.path || []}
              availableNodeIds={availableNodeIds}
              className="h-full shadow-md"
            />
          </div>
        </div>
      )}
    </div>
  );
}