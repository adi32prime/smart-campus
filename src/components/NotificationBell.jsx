import { useEffect, useRef, useState } from 'react';
import { Bell, X, Inbox, Calendar, Clock } from 'lucide-react';
import useSSE from '../hooks/useSSE';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell({ userId }) {
  const navigate = useNavigate(); 
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [bookings, setBookings] = useState([]); // Store user's bookings to match IDs
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const popRef = useRef(null);

  const { lastEvent } = useSSE(userId);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Fetch notifications AND the user's bookings simultaneously
        const [listRes, countRes, bookingsRes] = await Promise.all([
          fetch(`/api/notifications?userId=${userId}`),
          fetch(`/api/notifications/unread-count?userId=${userId}`),
          fetch(`/api/bookings?userId=${userId}`)
        ]);
        
        if (cancelled) return;
        
        if (listRes.ok) setNotifications(await listRes.json());
        if (countRes.ok) {
          const d = await countRes.json();
          setUnread(d.count || 0);
        }
        if (bookingsRes.ok) {
          const bData = await bookingsRes.json();
          if (Array.isArray(bData)) setBookings(bData);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!lastEvent) return;
    setNotifications((prev) => [lastEvent, ...prev].slice(0, 50));
    setUnread((u) => u + 1);
  }, [lastEvent]);

  useEffect(() => {
    function handle(e) {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  async function markAllRead() {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
    } catch {
      // silent
    }
  }

  // Helper to get the booking details from the notification
  const getBookingDetails = (notif) => {
    if (!notif.bookingId) return null;
    return bookings.find(b => Number(b.bookingId) === Number(notif.bookingId));
  };

  const formatDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); } 
    catch { return d; }
  };
  
  const formatTime = (t) => {
    if (!t) return '';
    try {
      const [h, m] = t.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${m} ${ampm}`;
    } catch { return t; }
  };

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        className={`relative inline-flex items-center justify-center rounded-lg border p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
          open 
            ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' 
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
        }`}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 transition-colors"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</p>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                <div className="h-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Inbox className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {notifications.map((n) => {
                  const details = getBookingDetails(n);
                  const isCancelled = n.message.toLowerCase().includes('cancel');

                  return (
                    <li
                      key={n.notificationId}
                      onClick={() => {
                        // 1. Mark as read immediately in the UI
                        setNotifications((prev) => prev.map(item => 
                          item.notificationId === n.notificationId ? { ...item, isRead: 1 } : item
                        ));
                        if (!n.isRead) setUnread((u) => Math.max(0, u - 1));

                        // 2. Close the dropdown
                        setOpen(false);

                        // 3. Navigate to the specific booking (highlight it)
                        if (n.bookingId) {
                          navigate(`/dashboard/bookings?id=${n.bookingId}`);
                        } else {
                          navigate('/dashboard/bookings');
                        }
                      }}
                      className={`cursor-pointer px-4 py-3 transition-colors ${
                        n.isRead 
                          ? 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/50' 
                          : 'bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-900/10 dark:hover:bg-indigo-900/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!n.isRead && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          {/* If we have the details, show the beautiful layout. Otherwise fallback to raw message */}
                          {details ? (
                            <>
                              <p className={`text-sm ${n.isRead ? 'text-slate-600 dark:text-slate-300' : 'font-medium text-slate-800 dark:text-slate-100'}`}>
                                {details.resourceName}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <Calendar className="h-3.5 w-3.5" /> {formatDate(details.date)}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <Clock className="h-3.5 w-3.5" /> {formatTime(details.startTime)} – {formatTime(details.endTime)}
                              </p>
                              <p className={`mt-1 text-[11px] font-semibold uppercase ${isCancelled ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {isCancelled ? 'Cancelled' : 'Confirmed'}
                              </p>
                            </>
                          ) : (
                            <p className={`text-sm ${n.isRead ? 'text-slate-600 dark:text-slate-300' : 'font-medium text-slate-800 dark:text-slate-100'}`}>
                              {n.message}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {n.createdAt}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}