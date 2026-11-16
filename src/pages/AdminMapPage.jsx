import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, MapPin, Calendar, Clock, X, ArrowRight } from "lucide-react";
import AdminHeader from "../components/AdminHeader";
import CampusMap from "../components/CampusMap";

const BASE_TIME_SLOTS = [
  { start: "09:00", end: "10:00", label: "9:00 AM – 10:00 AM" },
  { start: "10:00", end: "11:00", label: "10:00 AM – 11:00 AM" },
  { start: "11:00", end: "12:00", label: "11:00 AM – 12:00 PM" },
  { start: "12:00", end: "13:00", label: "12:00 PM – 1:00 PM" },
  { start: "13:00", end: "14:00", label: "1:00 PM – 2:00 PM" },
  { start: "14:00", end: "15:00", label: "2:00 PM – 3:00 PM" },
  { start: "15:00", end: "16:00", label: "3:00 PM – 4:00 PM" },
  { start: "16:00", end: "17:00", label: "4:00 PM – 5:00 PM" },
];

function pad(n) { return String(n).padStart(2, "0"); }
function toDateString(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function getNowSlotIndex() {
  const now = new Date();
  const hour = now.getHours();
  const idx = BASE_TIME_SLOTS.findIndex((s) => Number(s.start.split(":")[0]) === hour);
  return idx !== -1 ? idx : 0;
}

function isPastSlot(dateStr, startTime) {
  const now = new Date();
  const slotDateTime = new Date(`${dateStr}T${startTime}:00`);
  return slotDateTime.getTime() < now.getTime();
}

export default function AdminMapPage({ user, onLogout }) {
  const [date, setDate] = useState(toDateString(new Date()));
  const [slotIdx, setSlotIdx] = useState(getNowSlotIndex());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);

  const slot = BASE_TIME_SLOTS[slotIdx];

  useEffect(() => {
    async function load() {
      if (!slot) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          date,
          startTime: slot.start,
          endTime: slot.end,
        });
        const res = await fetch(`/api/admin/map-status?${params.toString()}`, {
          headers: { "X-Role": "Admin" },
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = await res.json();
        setData(json);
        setSelectedNode(null);
      } catch (err) {
        setError("Couldn't load map data.");
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [date, slotIdx]);

  function handleNodeClick(nodeId) {
    if (!data) return;
    const resource = data.resources.find((r) => r.nodeId === nodeId);
    if (resource && resource.status === "Occupied") {
      setSelectedNode(resource);
    } else {
      setSelectedNode(null);
    }
  }

  const isPast = slot ? isPastSlot(date, slot.start) : false;

  // undefined (not []) while there is no data, so rooms are not all painted red by mistake
  const availableNodeIds = data
    ? data.resources.filter((r) => r.status === "Available").map((r) => r.nodeId)
    : undefined;

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden">
      <AdminHeader user={user} onLogout={onLogout} />

      {/* Controls Bar */}
      <div className="shrink-0 z-30 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-[1600px] flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Time slot</label>
            <select
              value={slotIdx}
              onChange={(e) => setSlotIdx(Number(e.target.value))}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {BASE_TIME_SLOTS.map((s, i) => (
                <option key={s.start} value={i}>{s.label}</option>
              ))}
            </select>
          </div>

          <span className="hidden text-xs text-slate-400 dark:text-slate-500 md:inline">
            Click a red room to see who booked it
          </span>

          {data && (
            <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-red-600 dark:text-red-400">
                {data.resources.filter((r) => r.status === "Occupied").length} occupied
              </span>
              {" · "}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {data.resources.filter((r) => r.status === "Available").length} available
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Map Area: whole map shrinks to fit the space under the header + controls bar */}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {loading && !data ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <CampusMap
            userNodeId=""
            selectedNodeId={selectedNode?.nodeId || null}
            selectedLabel="SELECTED"
            clickableOccupied
            path={[]}
            availableNodeIds={availableNodeIds}
            onNodeClick={handleNodeClick}
            maxHeight="calc(100vh - 175px)"
            className="w-full h-full !rounded-none !border-none"
          />
        )}

        {/* POPUP: Occupied Node Details */}
        {selectedNode && (
          <div className="absolute bottom-6 left-6 z-30 w-80">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
                    {isPast ? "Used by" : "Booked by"}
                  </p>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 truncate">
                    User ID {selectedNode.booking?.userId}
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {selectedNode.booking?.userRole}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-1.5 border-t border-slate-200 dark:border-slate-700 pt-3 text-sm">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {selectedNode.resourceName}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3.5 w-3.5" /> {selectedNode.departmentName} · {selectedNode.typeName}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" /> {date}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5" /> {slot?.label}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Booking #{selectedNode.booking?.bookingId}
                </p>
              </div>

              <Link
                to="/admin/reports"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
              >
                View in Reports <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}