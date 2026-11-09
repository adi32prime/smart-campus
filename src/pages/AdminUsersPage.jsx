import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  X,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import AdminHeader from "../components/AdminHeader";

const ROLE_OPTIONS = ["Student", "Faculty", "Admin"];

function authHeaders() {
  return { "X-Role": "Admin", "Content-Type": "application/json" };
}

export default function AdminUsersPage({ user, onLogout }) {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Modal state
  const [modal, setModal] = useState(null); 
  const [form, setForm] = useState({ userId: "", password: "", role: "Student", status: "Active" });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadUsers = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", { headers: authHeaders(), signal });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError("Couldn't load users. Please try again.");
    } finally {
      if (!signal || !signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadUsers(controller.signal);
    return () => controller.abort();
  }, [loadUsers, reloadKey]);

  function openAdd() {
    setForm({ userId: "", password: "", role: "Student", status: "Active" });
    setModalError("");
    setModal({ mode: "add" });
  }
  function openEdit(u) {
    setForm({ userId: u.userId, password: "", role: u.role, status: u.status });
    setModalError("");
    setModal({ mode: "edit", user: u });
  }
  function openReset(u) {
    setForm({ userId: u.userId, password: "", role: u.role, status: u.status });
    setModalError("");
    setModal({ mode: "reset", user: u });
  }
  function closeModal() {
    setModal(null);
    setModalError("");
  }

  async function submitModal(e) {
    e.preventDefault();
    if (submitting) return;
    setModalError("");
    setSubmitting(true);

    try {
      if (modal.mode === "add") {
        if (!form.userId || !form.password || !form.role) throw new Error("All fields are required.");
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ userId: Number(form.userId), password: form.password, role: form.role }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to add user");
      } else if (modal.mode === "edit") {
        const res = await fetch(`/api/admin/users/${modal.user.userId}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ role: form.role, status: form.status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update user");
      } else if (modal.mode === "reset") {
        if (!form.password) throw new Error("Enter a new password.");
        const res = await fetch(`/api/admin/users/${modal.user.userId}/reset-password`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ newPassword: form.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to reset password");
      }
      closeModal();
      setReloadKey((k) => k + 1);
    } catch (err) {
      setModalError(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete user ${u.userId}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.userId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    }
  }

  const fieldClass = "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <AdminHeader user={user} onLogout={onLogout} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <li><Link to="/admin" className="rounded hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">Admin</Link></li>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <li aria-current="page" className="font-medium text-slate-800 dark:text-slate-200">Users</li>
          </ol>
        </nav>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Manage</p>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Add, edit, delete users and reset their passwords.</p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add user
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </span>
            <button onClick={() => setReloadKey((k) => k + 1)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors">
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No users yet.</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">User ID</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{u.userId}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.role === "Admin" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
                        u.role === "Faculty" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${
                        u.status === "Active" ? "text-green-700 dark:text-green-400" : "text-slate-500 dark:text-slate-400"
                      }`}>
                        <span className={`h-2 w-2 rounded-full ${u.status === "Active" ? "bg-green-500" : "bg-slate-400"}`} />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(u)} aria-label={`Edit ${u.userId}`} className="rounded-lg border border-slate-200 dark:border-slate-600 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openReset(u)} aria-label={`Reset password for ${u.userId}`} className="rounded-lg border border-slate-200 dark:border-slate-600 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(u)} aria-label={`Delete ${u.userId}`} className="rounded-lg border border-red-200 dark:border-red-900/50 p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={submitModal} className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-5 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {modal.mode === "add" && "Add user"}
                {modal.mode === "edit" && `Edit user ${modal.user.userId}`}
                {modal.mode === "reset" && `Reset password for ${modal.user.userId}`}
              </h2>
              <button type="button" onClick={closeModal} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {modal.mode === "add" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">User ID</label>
                  <input type="number" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className={fieldClass} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Password</label>
                  <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={fieldClass} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={fieldClass}>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            )}

            {modal.mode === "edit" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={fieldClass}>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={fieldClass}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            )}

            {modal.mode === "reset" && (
              <div>
                <label className="mb-1 block text-sm font-medium">New password</label>
                <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={fieldClass} required />
              </div>
            )}

            {modalError && (
              <p className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" /> {modalError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeModal} disabled={submitting} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {modal.mode === "add" ? "Add" : modal.mode === "edit" ? "Save" : "Reset"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}