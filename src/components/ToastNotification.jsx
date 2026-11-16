import { useEffect, useState } from 'react';
import { X, CheckCircle2, Calendar, Clock, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ToastNotification({ notification, onClose, user }) {
  const [isVisible, setIsVisible] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [unreadCount, setUnreadCount] = useState(1);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      
      if (user?.userId) {
        fetch(`/api/notifications/unread-count?userId=${user.userId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.count !== undefined) {
              setUnreadCount(data.count === 0 ? 1 : data.count);
            }
          })
          .catch(console.error);

        fetch(`/api/bookings?userId=${user.userId}`)
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data) && data.length > 0) {
              let matched = data.find((b) => Number(b.bookingId) === Number(notification.bookingId));
              if (!matched) matched = data[0]; 
              if (matched) setBookingDetails(matched);
            }
          })
          .catch((err) => console.error("Toast fetch error:", err));
      }

      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [notification, user, onClose]);

  if (!notification) return null;

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

  const isCancellation = notification.message && notification.message.toLowerCase().includes('cancel');
  const isPromotion = notification.message && notification.message.toLowerCase().includes('promot');
  
  // Determine the specific title based on the notification content
  let eventTitle = "Booking Confirmed";
  if (isCancellation) eventTitle = "Booking Cancelled";
  else if (isPromotion) eventTitle = "Waitlist Promoted!";

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className={`flex w-80 items-start gap-3 rounded-xl border bg-white dark:bg-slate-800 p-4 shadow-2xl transition-colors ${isCancellation ? 'border-red-200 dark:border-red-900/50' : 'border-green-200 dark:border-green-900/50'}`}>
        
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCancellation ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
          {isCancellation 
            ? <X className="h-5 w-5 text-red-600 dark:text-red-400" /> 
            : <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
        </div>

        <div className="min-w-0 flex-1">
          
          {/* DYNAMIC COUNTER TITLE */}
          <div className="flex items-center gap-1.5 mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Bell className="h-3 w-3" />
            {unreadCount === 1 ? "1 notification" : `${unreadCount} notifications`}
          </div>

          {/* HARDCODED EVENT TITLE */}
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {eventTitle}
          </p>
          
          {bookingDetails ? (
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-medium text-slate-900 dark:text-white">{bookingDetails.resourceName}</p>
              <p className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(bookingDetails.date)}
              </p>
              <p className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5" /> {formatTime(bookingDetails.startTime)} – {formatTime(bookingDetails.endTime)}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <Link to="/dashboard/bookings" onClick={() => onClose()} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                  View in My Bookings →
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-snug">
              {notification.message}
            </p>
          )}
        </div>

        <button 
          onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} 
          className="shrink-0 rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}