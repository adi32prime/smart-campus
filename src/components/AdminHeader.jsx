import { Link, useLocation } from "react-router-dom";
import { LogOut, Users, FileClock, ShieldCheck, LayoutDashboard, MapPin } from "lucide-react";
import ThemeToggle from "./ThemeToggle";


export default function AdminHeader({ user, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/map", label: "Map", icon: MapPin },       // NEW
    { path: "/admin/users", label: "Users", icon: Users },
    { path: "/admin/audit-logs", label: "Audit Logs", icon: FileClock },
    { path: "/admin/reports", label: "Reports", icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors duration-300">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        
        {/* Logo */}
        <Link to="/admin" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">SC</span>
          <span className="hidden text-sm font-semibold sm:block">Smart Campus</span>
          <span className="hidden border-l border-slate-200 dark:border-slate-700 pl-3 text-xs text-slate-500 dark:text-slate-400 md:block">Admin Panel</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400"
                    : "border border-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Toggle, Admin Badge, Logout */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> 
            {user?.userId}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="flex gap-2 overflow-x-auto border-t border-slate-200 dark:border-slate-700 px-4 py-2 md:hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400"
                  : "border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
