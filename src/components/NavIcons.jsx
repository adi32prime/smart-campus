import { Link } from "react-router-dom";
import { MapPin, CalendarClock } from "lucide-react";

export default function NavIcons({ current = "" }) {
  const baseClass =
    "p-2 rounded-lg border transition-colors";
  const inactiveClass =
    "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600";
  const activeClass =
    "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700";

  return (
    <>
      <Link
        to="/dashboard/search"
        title="Search Resources"
        className={`${baseClass} ${current === "search" ? activeClass : inactiveClass}`}
      >
        <MapPin className="h-4 w-4" />
      </Link>
      <Link
        to="/dashboard/bookings"
        title="My Bookings"
        className={`${baseClass} ${current === "bookings" ? activeClass : inactiveClass}`}
      >
        <CalendarClock className="h-4 w-4" />
      </Link>
    </>
  );
}