import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, LogOut, AlertCircle, FileClock } from "lucide-react";
import AdminHeader from "../components/AdminHeader";

const ACTION_STYLES = {
  CREATE_BOOKING: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCEL_BOOKING: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  WAITLIST_BOOKING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PROMOTE_WAITLIST: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  ADD_USER: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  UPDATE_USER: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  DELETE_USER: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  RESET_PASSWORD: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};
// Helper to make the audit logs human-readable
function formatEntity(type, id) {
  if (!type) return "System";
  const safeType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  if (!id) return safeType;
  return `${safeType} ${id}`;
}

function formatDetails(action, oldVal, newVal) {
  let text = "";
  if (newVal) {
    // Convert "role=Faculty status=Inactive" to "Role to Faculty, Status to Inactive"
    const cleanNew = newVal
      .replace(/role=/g, "Role to ")
      .replace(/status=/g, "Status to ")
      .replace(/priority=/g, "Priority ")
      .replace(/resource=/g, "Resource ")
      .replace(/date=/g, "Date ")
      .replace(/position=/g, "Position ")
      .replace(/ and /g, ", ");
    text += `New: ${cleanNew}`;
  }
  if (oldVal) {
    text += text ? ` | Old: ${oldVal}` : `Old: ${oldVal}`;
  }
  return text || "—";
}

export default function AdminAuditLogsPage({ user, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/audit-logs?limit=100", {
        headers: { "X-Role": "Admin" },
        signal,
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError("Couldn't load audit logs.");
    } finally {
      if (!signal || !signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, reloadKey]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <AdminHeader user={user} onLogout={onLogout} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <li><Link to="/admin" className="rounded hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">Admin</Link></li>
            <ChevronRight className="h-4 w-4" />
            <li aria-current="page" className="font-medium text-slate-800 dark:text-slate-200">Audit Logs</li>
          </ol>
        </nav>

        <div className="mb-6">
          <p className="text-xs uppercase text-slate-500 dark:text-slate-400">History</p>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Every action taken by users and the system.</p>
        </div>
        {error && (
          <div role="alert" className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</span>
            <button onClick={() => setReloadKey((k) => k + 1)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">Retry</button>
          </div>
        )}

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors">
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-200" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <FileClock className="mb-3 h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-500">No audit events yet.</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Affected Item</th>
                  <th className="px-4 py-3 font-medium">Actor (User)</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {logs.map((l) => (
                  <tr key={l.auditId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{l.auditId}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_STYLES[l.action] || "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"}`}>
                        {l.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                      {formatEntity(l.entityType, l.entityId)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {l.userId ? `User ${l.userId}` : "System"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {formatDetails(l.action, l.oldValue, l.newValue)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{l.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}