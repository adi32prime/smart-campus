import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  LogOut,
  AlertCircle,
  RefreshCw,
  Loader2,
  Building2,
  Boxes,
  Users,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
  XCircle,
  FileClock,
  Calendar,
  Clock,
  ArrowRight,
  X,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import AdminHeader from "../components/AdminHeader";

const REFRESH_MS = 30000;

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

const pad = (n) => String(n).padStart(2, "0");
const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

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

function formatTime(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDateTime(dateString, startTime, endTime) {
  const [y, m, d] = String(dateString).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const datePart = Number.isNaN(dt.getTime())
    ? dateString
    : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${datePart} · ${formatTime(startTime)} – ${formatTime(endTime)}`;
}

function getStatusBadge(status) {
  switch (String(status).toLowerCase()) {
    case "available":
      return { className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Available" };
    case "occupied":
      return { className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "Occupied" };
    default:
      return { className: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300", label: status || "Unknown" };
  }
}

function Badge({ status, small = false }) {
  const { className, label } = getStatusBadge(status);
  return (
    <span className={`shrink-0 rounded-full font-medium ${small ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs"} ${className}`}>
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, value, label }) {
  const fmtNum = (n) => (typeof n === "number" ? n.toLocaleString("en-IN") : "–");
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-colors">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/50">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
      </div>
      <p className="text-3xl font-bold">{fmtNum(value)}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

async function request(url, signal, isValid, headers = {}) {
  try {
    const res = await fetch(url, { signal, headers });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    if (!isValid(data)) throw new Error("Unexpected response");
    return { ok: true, data };
  } catch (err) {
    return { ok: false, err };
  }
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function groupByDepartment(resources) {
  const groups = {};
  resources.forEach((r) => {
    const key = r.departmentName || "Unassigned";
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return groups;
}

export default function AdminDashboardPage({ user, onLogout }) {
  const navigate = useNavigate();

  const [date, setDate] = useState(toDateString(new Date()));
  const [slotIdx, setSlotIdx] = useState(getNowSlotIndex());
  const [stats, setStats] = useState(null);
  const [resourceData, setResourceData] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState({ stats: false, resources: false, bookings: false });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState({});
  const [expandedResource, setExpandedResource] = useState(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [allBookings, setAllBookings] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const controllerRef = useRef(null);
  const slot = BASE_TIME_SLOTS[slotIdx];

  const loadAll = useCallback(async () => {
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;
    setRefreshing(true);

    const adminHeaders = { "X-Role": "Admin" };
    const mapParams = new URLSearchParams({ date, startTime: slot.start, endTime: slot.end });

    const [s, r, b] = await Promise.all([
      request("/api/admin/stats", signal, isObject, adminHeaders),
      request(`/api/admin/map-status?${mapParams.toString()}`, signal, isObject, adminHeaders),
      request("/api/bookings?status=all&limit=5", signal, Array.isArray),    ]);

    if (signal.aborted) return;

    if (s.ok) setStats(s.data);
    if (r.ok) setResourceData(r.data);
    if (b.ok) setRecentBookings(b.data.slice(0, 10));

    setFailed({ stats: !s.ok, resources: !r.ok, bookings: !b.ok });
    if (s.ok || r.ok || b.ok) setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [date, slot.start, slot.end]);   // <-- end of loadAll
    async function handleShowAll() {
    if (showAllBookings) {
      // Collapse
      setShowAllBookings(false);
      return;
    }
    // Expand — fetch all bookings once
    setShowAllBookings(true);
    if (allBookings.length > 0) return; // already fetched
    setLoadingAll(true);
    try {
      const res = await fetch("/api/admin/recent-bookings?limit=200", {
        headers: { "X-Role": "Admin" },
      });
      if (res.ok) {
        const data = await res.json();
        setAllBookings(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    } finally {
      setLoadingAll(false);
    }
  }

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, REFRESH_MS);
    return () => {
      clearInterval(id);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [loadAll]);

  // Reset expanded resource when date or slot changes
  useEffect(() => {
    setExpandedResource(null);
  }, [date, slotIdx]);

  const resources = resourceData?.resources || [];
  const groups = useMemo(() => groupByDepartment(resources), [resources]);

  const deptCards = useMemo(() => {
    const departmentNames = Object.keys(groups);
    return departmentNames.map((name) => ({
      id: name,
      name,
      count: groups[name].length,
      resources: groups[name],
    }));
  }, [groups]);

  function isExpanded(deptId, index) {
    return expandedDepts[deptId] ?? index === 0;
  }

  function toggleDept(deptId) {
    const index = deptCards.findIndex((c) => c.id === deptId);
    setExpandedDepts((prev) => ({ ...prev, [deptId]: !(prev[deptId] ?? index === 0) }));
  }

  const derivedAvailable = resources.filter((r) => r.status === "Available").length;
  const derivedOccupied = resources.filter((r) => r.status === "Occupied").length;
  const isPast = slot ? isPastSlot(date, slot.start) : false;

  const failedCount = Object.values(failed).filter(Boolean).length;
  const allFailed = failedCount === 3;
  const partialFailed = failedCount > 0 && !allFailed;

  const cardClass = "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <AdminHeader user={user} onLogout={onLogout} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {allFailed && !loading && (
          <div role="alert" className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              Couldn&apos;t load dashboard data.
            </div>
            <button type="button" onClick={loadAll} className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:self-auto">Retry</button>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">System Overview</p>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Live status of all campus resources and bookings.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span aria-live="polite">
              {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : "Not updated yet"}
            </span>
            {refreshing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <button type="button" onClick={loadAll} disabled={refreshing} aria-label="Refresh" className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-60">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <section aria-label="Campus totals" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            [0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)
          ) : (
            <>
              <StatCard icon={Building2} value={stats?.totalDepartments} label="Departments" />
              <StatCard icon={Boxes} value={stats?.totalResources} label="Total Resources" />
              <StatCard icon={Users} value={stats?.totalUsers} label="Total Users" />
              <StatCard icon={CalendarClock} value={stats?.totalBookings} label="Total Bookings" />
            </>
          )}
        </section>

        {/* Resource Status Panel */}
        <section aria-label="Resource status" className={`${cardClass} mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Resource Status
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Status for {slot?.label} on {date}
            </p>
          </div>
          {loading ? (
            <div className="h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ) : (
            <div className="flex gap-6 text-sm">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                {derivedAvailable} Available
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                {derivedOccupied} Occupied
              </span>
            </div>
          )}
        </section>

        {/* Date + Time Picker */}
        <section className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
          <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <select
            value={slotIdx}
            onChange={(e) => setSlotIdx(Number(e.target.value))}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {BASE_TIME_SLOTS.map((s, i) => (
              <option key={s.start} value={i}>{s.label}</option>
            ))}
          </select>
        </section>
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <section aria-labelledby="dept-heading" className="lg:col-span-3">
            <h2 id="dept-heading" className="mb-3 text-sm font-semibold">Resource Status by Department</h2>

            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}
              </div>
            ) : deptCards.length === 0 ? (
              <div className={`${cardClass} px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400`}>No resources configured.</div>
            ) : (
              <div className="space-y-4">
                {deptCards.map((dept, index) => {
                  const open = isExpanded(dept.id, index);
                  const panelId = `dept-panel-${index}`;
                  const available = dept.resources.filter((r) => r.status === "Available").length;
                  const occupied = dept.resources.filter((r) => r.status === "Occupied").length;

                  return (
                    <div key={dept.id} className={cardClass}>
                      <button type="button" onClick={() => toggleDept(dept.id)} aria-expanded={open} aria-controls={panelId} className="flex w-full items-center justify-between gap-3 rounded-xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                        <span className="flex min-w-0 items-center gap-2">
                          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
                          <span className="truncate font-semibold">{dept.name}</span>
                          <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{dept.count} resources</span>
                        </span>
                        <span className="hidden shrink-0 items-center gap-3 text-xs text-slate-500 dark:text-slate-400 sm:flex">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> {available} available
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /> {occupied} occupied
                          </span>
                        </span>
                      </button>
                      <div id={panelId} aria-hidden={!open} className={`grid transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden">
                          <ul className="border-t border-slate-200 dark:border-slate-700">
                            {dept.resources.map((r) => {
                              const isExpanded = expandedResource === r.resourceId;
                              const isOccupied = r.status === "Occupied";
                              return (
                                <li key={r.resourceId} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                                  <button
                                    type="button"
                                    disabled={!isOccupied}
                                    onClick={() => setExpandedResource(isExpanded ? null : r.resourceId)}
                                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                                      isOccupied ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50" : "cursor-default"
                                    }`}
                                  >
                                    <span className="min-w-0 truncate text-sm">
                                      {r.resourceName}
                                      {r.typeName && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{r.typeName}</span>}
                                    </span>
                                    <Badge status={r.status} />
                                  </button>

                                  {isExpanded && isOccupied && r.booking && (
                                    <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
                                            {isPast ? "Used by" : "Booked by"}
                                          </p>
                                          <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                                            User ID {r.booking.userId}
                                          </p>
                                          <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {r.booking.userRole}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => setExpandedResource(null)}
                                          className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                                        <p><span className="text-slate-500 dark:text-slate-400">Booking:</span> #{r.booking.bookingId}</p>
                                        <p><span className="text-slate-500 dark:text-slate-400">Resource:</span> {r.resourceName}</p>
                                        <p><span className="text-slate-500 dark:text-slate-400">Date:</span> {date}</p>
                                        <p><span className="text-slate-500 dark:text-slate-400">Time:</span> {slot?.label}</p>
                                      </div>
                                      <Link
                                        to="/admin/reports"
                                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                                      >
                                        View in Reports <ArrowRight className="h-3 w-3" />
                                      </Link>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="recent-heading" className="lg:col-span-2">
            <div className={`${cardClass} p-4`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 id="recent-heading" className="text-sm font-semibold">Recent Bookings</h2>
                {showAllBookings && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {allBookings.length} bookings
                  </span>
                )}
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  ))}
                </div>
              ) : showAllBookings && loadingAll ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <>
                  {(showAllBookings ? allBookings : recentBookings).length === 0 ? (
                    <p className="py-6 text-sm text-slate-500 dark:text-slate-400">No bookings yet.</p>
                  ) : (
                    <ul className={`divide-y divide-slate-200 dark:divide-slate-700 overflow-y-auto ${showAllBookings ? "max-h-[32rem]" : "max-h-96"}`}>
                      {(showAllBookings ? allBookings : recentBookings).map((b) => (
                        <li key={b.bookingId} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{b.resourceName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{b.userId}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(b.date, b.startTime, b.endTime)}</p>
                          </div>
                          <Badge status={b.status} small />
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                <button
                  type="button"
                  onClick={handleShowAll}
                  disabled={loadingAll}
                  className="rounded text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-60"
                >
                  {showAllBookings ? "Show Less ↑" : "View all →"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}