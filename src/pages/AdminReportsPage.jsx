import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LogOut, ChevronRight, AlertCircle, Loader2, BarChart3,
  TrendingUp, Clock, Timer, Download, Printer, ArrowLeft,
  CheckCircle2, XCircle, Users, ListChecks, ShoppingBag,
} from "lucide-react";
import AdminHeader from "../components/AdminHeader";

const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "month", label: "This month" },
];
const STATUS_COLORS = {
  Confirmed: "#10b981",
  Cancelled: "#ef4444",
  Waitlisted: "#f59e0b",
  Rejected: "#6366f1",
  Pending: "#8b5cf6",
};

function StatCard({ icon: Icon, value, label, subtitle, trend }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-colors">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/50">
          <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        {trend != null && (
          <span className={`text-xs font-medium ${trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold">
        {value === null || value === undefined ? "—" : value}
      </p>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function BarChart({ data, color = "bg-indigo-500" }) {
  if (!data || data.length === 0) return <EmptyChart message="No data available." />;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs text-slate-600 dark:text-slate-400">{d.label}</span>
          <div className="flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-700">
            <div className={`${color} h-6 rounded transition-all`} style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-700 dark:text-slate-300">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function StackedTrendChart({ data }) {
  if (!data || data.length === 0) return <EmptyChart message="No trend data available." />;

  const width = 900;
  const height = 240;
  const pad = 40;
  const max = Math.max(...data.map((d) => d.total), 1);
  const stepX = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Booking trend">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
      {data.map((d, i) => {
        const x = pad + i * stepX;
        const hTotal = (d.total / max) * (height - pad * 2);
        const hConfirmed = (d.confirmed / max) * (height - pad * 2);
        return (
          <g key={i}>
            <rect x={x - 6} y={height - pad - hTotal} width="12" height={hTotal} fill="#ef4444" opacity="0.4" rx="2" />
            <rect x={x - 6} y={height - pad - hConfirmed} width="12" height={hConfirmed} fill="#10b981" rx="2" />
            {i % 3 === 0 && (
              <text x={x} y={height - 10} textAnchor="middle" fontSize="9" className="fill-slate-500 dark:fill-slate-400">
                {String(d.date).slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function StatusDonut({ data }) {
  if (!data || data.length === 0) return <EmptyChart message="No status data available." />;
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-around">
      <svg viewBox="0 0 200 200" className="h-40 w-40 -rotate-90">
        <circle cx="100" cy="100" r={radius} fill="none" strokeWidth="28" className="stroke-slate-100 dark:stroke-slate-700" />
        {data.map((d) => {
          const fraction = total > 0 ? d.count / total : 0;
          const dashLength = circumference * fraction;
          const stroke = STATUS_COLORS[d.status] || "#94a3b8";
          const el = (
            <circle
              key={d.status}
              cx="100" cy="100" r={radius}
              fill="none" stroke={stroke}
              strokeWidth="28"
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dashLength;
          return el;
        })}
        <text x="100" y="95" textAnchor="middle" dominantBaseline="central" fontSize="24" fontWeight="700" className="fill-slate-800 dark:fill-slate-100 rotate-90 origin-center">
          {total}
        </text>
        <text x="100" y="120" textAnchor="middle" fontSize="10" className="fill-slate-500 dark:fill-slate-400 rotate-90 origin-center">
          BOOKINGS
        </text>
      </svg>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.status] || "#94a3b8" }} />
            <span className="text-slate-600 dark:text-slate-300">{d.status}</span>
            <span className="ml-auto font-medium text-slate-800 dark:text-slate-100">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminReportsPage({ user, onLogout }) {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/reports?range=${range}`, {
          headers: { "X-Role": "Admin" },
          signal,
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError("Couldn't load reports.");
      } finally {
        if (!signal || !signal.aborted) setLoading(false);
      }
    },
    [range]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function exportCsv() {
    if (!data) return;
    const lines = [
      ["Metric", "Value"],
      ["Range", data.range],
      ["Start Date", data.startDate],
      ["End Date", data.endDate],
      ["Total Bookings", data.totalBookings],
      ["Confirmed", data.confirmedBookings],
      ["Slot Utilization %", data.utilPct],
      ["Pending Now", data.pendingCount],
      ["Waitlisted Now", data.waitlistedCount],
      ["Cancellation %", data.cancelPct],
      [],
      ["Status Breakdown"],
      ...(data.statusBreakdown || []).map((s) => [s.status, s.count]),
      [],
      ["Top Resources"],
      ...(data.topResources || []).map((r) => [r.resourceName, r.confirmed]),
    ];
    const csv = lines.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smart-campus-report-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const trendPct =
    data && data.previousTotal > 0
      ? Math.round(((data.totalBookings - data.previousTotal) / data.previousTotal) * 100)
      : null;

  const typeData = data?.byResourceType?.map((t) => ({ label: t.name, count: t.count })) || [];
  const deptData = data?.byDepartment?.map((d) => ({ label: d.name, count: d.count })) || [];

  const cardClass = "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-colors";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <AdminHeader user={user} onLogout={onLogout} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <li><Link to="/admin" className="rounded hover:text-indigo-600 dark:hover:text-indigo-400">Admin</Link></li>
            <ChevronRight className="h-4 w-4" />
            <li aria-current="page" className="font-medium text-slate-800 dark:text-slate-200">Reports</li>
          </ol>
        </nav>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Analytics</p>
            <h1 className="text-3xl font-bold">Reports &amp; Analytics</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Utilization trends, peak hours, and department-wise statistics.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="range" className="text-xs text-slate-500 dark:text-slate-400">Date range</label>
            <select id="range" value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
              {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
            <span className="flex items-center gap-2"><AlertCircle className="h-5 w-5 shrink-0" /> {error}</span>
            <button onClick={() => load()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Retry</button>
          </div>
        )}

        {/* KPI Row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            [0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)
          ) : (
            <>
              <StatCard icon={BarChart3} value={data?.totalBookings} label="Total Bookings" subtitle={`${data?.confirmedBookings || 0} confirmed`} trend={trendPct} />
              <StatCard icon={TrendingUp} value={`${data?.utilPct || 0}%`} label="Slot Utilization" subtitle="Of active capacity" />
              <StatCard icon={ListChecks} value={(data?.pendingCount || 0) + (data?.waitlistedCount || 0)} label="Pending Actions" subtitle={`${data?.pendingCount || 0} pending · ${data?.waitlistedCount || 0} waitlisted`} />
              <StatCard icon={XCircle} value={`${data?.cancelPct || 0}%`} label="Cancellation Rate" subtitle="Of all bookings in range" />
            </>
          )}
        </section>

        {/* Trend Chart */}
        <section className={`${cardClass} mt-6`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-semibold">Booking Trend</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">· {RANGES.find((r) => r.value === range)?.label}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Confirmed</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500/50" /> Cancelled</span>
            </div>
          </div>
          {loading ? <div className="h-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : <StackedTrendChart data={data?.trend || []} />}
        </section>

        {/* Status breakdown + Peak hours */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className={cardClass}>
            <h2 className="mb-4 text-sm font-semibold">Booking Status Breakdown</h2>
            {loading ? <div className="h-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : <StatusDonut data={data?.statusBreakdown || []} />}
          </section>
          <section className={cardClass}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Peak Hours</h2>
              {data?.peakHour != null && (
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                  Peak: {String(data.peakHour).padStart(2, "0")}:00
                </span>
              )}
            </div>
            {loading ? <div className="h-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : (
              <BarChart
                data={(data?.hourly || []).map((h) => ({
                  label: `${String(parseInt(h.startTime)).padStart(2, "0")}:00`,
                  count: h.confirmed,
                }))}
              />
            )}
          </section>
        </div>

        {/* By Resource Type + Department */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className={cardClass}>
            <h2 className="mb-4 text-sm font-semibold">By Resource Type</h2>
            {loading ? <div className="h-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : <BarChart data={typeData} color="bg-emerald-500" />}
          </section>
          <section className={cardClass}>
            <h2 className="mb-4 text-sm font-semibold">Department Utilization</h2>
            {loading ? <div className="h-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : <BarChart data={deptData} color="bg-amber-500" />}
          </section>
        </div>

        {/* Top 5 Resources */}
        <section className={`${cardClass} mt-6`}>
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold">Top 5 Most Booked Resources</h2>
          </div>
          {loading ? (
            <div className="h-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          ) : (data?.topResources || []).length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No booking data in this range.</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {data.topResources.map((r, i) => (
                <li key={r.resourceId} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.resourceName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.departmentName} · {r.typeName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{r.confirmed}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">bookings</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Footer actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button type="button" onClick={exportCsv} disabled={!data} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
              <Download className="h-4 w-4" /> Export as CSV
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}