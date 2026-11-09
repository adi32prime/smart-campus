import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LogOut, ChevronRight, AlertCircle, Loader2, BarChart3,
  TrendingUp, Clock, Timer, Download, Printer, ArrowLeft,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import AdminHeader from "../components/AdminHeader";

const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

function StatCard({ icon: Icon, value, label, suffix = "" }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-colors">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/50">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <p className="text-3xl font-bold">
        {value === null || value === undefined ? "—" : value}
        {suffix}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
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

function LineChart({ data }) {
  if (!data || data.length === 0) return <EmptyChart message="No trend data available." />;

  const width = 700;
  const height = 200;
  const pad = 40;
  const max = Math.max(...data.map((d) => d.count), 1);
  const stepX = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = height - pad - (d.count / max) * (height - pad * 2);
    return { x, y, ...d };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Booking trend">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
      <path d={path} fill="none" stroke="#4f46e5" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#4f46e5" />
          <text x={p.x} y={height - 10} textAnchor="middle" fontSize="10" className="fill-slate-500 dark:fill-slate-400">
            {String(p.date).slice(5)}
          </text>
          <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" className="fill-slate-700 dark:fill-slate-300">
            {p.count}
          </text>
        </g>
      ))}
    </svg>
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
      ["Metric", "Value"], ["Range", data.range], ["Total Bookings", data.totalBookings],
      ["Confirmed", data.confirmedBookings], ["Cancelled", data.cancelledBookings],
      ["Utilization Rate (%)", data.utilizationRate], ["Average Duration (min)", data.avgDuration],
      ["Peak Hour", data.peakHour ?? "—"], [], ["Trend Date", "Bookings"],
      ...(data.trend || []).map((t) => [String(t.date), t.count]), [],
      ["Hour", "Bookings"], ...(data.hourly || []).map((h) => [`${h.hour}:00`, h.count]), [],
      ["Resource Type", "Bookings"], ...(data.byResourceType || []).map((r) => [r.name, r.count]), [],
      ["Department", "Bookings"], ...(data.byDepartment || []).map((d) => [d.name, d.count]),
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

  const peakHourLabel = data?.peakHour != null ? `${String(data.peakHour).padStart(2, "0")}:00 – ${String(data.peakHour + 1).padStart(2, "0")}:00` : "—";
  const hourlyData = data?.hourly?.map((h) => ({ label: `${String(h.hour).padStart(2, "0")}:00`, count: h.count })) || [];
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

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            [0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)
          ) : (
            <>
              <StatCard icon={BarChart3} value={data?.totalBookings} label="Total Bookings" />
              <StatCard icon={TrendingUp} value={data?.utilizationRate} label="Utilization Rate" suffix="%" />
              <StatCard icon={Clock} value={peakHourLabel} label="Peak Hour" />
              <StatCard icon={Timer} value={data?.avgDuration} label="Avg. Duration" suffix=" min" />
            </>
          )}
        </section>

        <section className={`${cardClass} mt-6`}>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold">Booking Trend</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">· {RANGES.find((r) => r.value === range)?.label}</span>
          </div>
          {loading ? <div className="h-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : <LineChart data={data?.trend || []} />}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className={cardClass}>
            <h2 className="mb-4 text-sm font-semibold">Peak Hours</h2>
            {loading ? <div className="h-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : <BarChart data={hourlyData} />}
          </section>
          <section className={cardClass}>
            <h2 className="mb-4 text-sm font-semibold">By Resource Type</h2>
            {loading ? <div className="h-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : <BarChart data={typeData} color="bg-emerald-500" />}
          </section>
        </div>

        <section className={`${cardClass} mt-6`}>
          <h2 className="mb-4 text-sm font-semibold">Department Utilization</h2>
          {loading ? <div className="h-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : <BarChart data={deptData} color="bg-amber-500" />}
        </section>

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