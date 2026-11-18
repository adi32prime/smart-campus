import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DepartmentPage from './pages/DepartmentPage';
import ResourceListPage from './pages/ResourceListPage';
import BookingFormPage from './pages/BookingFormPage';
import BookingStatusPage from './pages/BookingStatusPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';
import SearchResourcesPage from './pages/SearchResourcesPage';
import AdminMapPage from './pages/AdminMapPage';
import ErrorBoundary from './components/ErrorBoundary';

import useSSE from './hooks/useSSE';
import ToastNotification from './components/ToastNotification';

export default function App() {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);
  const [toastData, setToastData] = useState(null);
  
  // Only connect to SSE if the user is logged in
  const { lastEvent } = useSSE(user?.userId);

  useEffect(() => {
    if (lastEvent) {
      setToastData(lastEvent);
    }
  }, [lastEvent]);


  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = localStorage.getItem('sc_token');

      if (!token) {
        setIsReady(true);
        return;
      }

      try {
        const res = await fetch(
          import.meta.env.VITE_API_BASE_URL + '/api/auth/me',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('sc_token');
          localStorage.removeItem('sc_user');
          setUser(null);
          return;
        }

        if (!res.ok) {
          throw new Error(`Session check failed: ${res.status}`);
        }

        const data = await res.json();

        if (!cancelled) {
          localStorage.setItem('sc_user', JSON.stringify(data.user));
          setUser(data.user);
        }
      } catch (error) {
        console.error('Session restoration failed:', error);

        if (!cancelled) {
          setSessionCheckFailed(true);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);


  async function handleLogin({ role, userId, password }) {
      const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: role.charAt(0).toUpperCase() + role.slice(1),
        userId,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('sc_token', data.token);
    localStorage.setItem('sc_user', JSON.stringify(data.user));

    setUser(data.user);
    return data.user;
  }

  function handleLogout() {
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_user');
    setUser(null);
  }

  function RequireUser(children, roles = []) {
    if (!isReady) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      );
    }
    if (!user) return <Navigate to="/login" replace />;
    if (roles.length && !roles.includes(user.role)) {
      return <Navigate to="/login" replace />;
    }
    return children;
  }

  if (sessionCheckFailed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-700 dark:text-slate-200">
          Unable to verify your login session. Your saved login has not been deleted.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-white"
        >
          Try Again
        </button>
      </div>
    );
  }


  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            !isReady ? (
              <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : user ? (
              <Navigate to={user.role === 'Admin' ? '/admin' : '/dashboard'} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />

        {/* Student / Faculty routes */}
        <Route
          path="/dashboard"
          element={RequireUser(<DashboardPage user={user} onLogout={handleLogout} />, ['Student', 'Faculty'])}
        />
        <Route
          path="/dashboard/department/:deptId"
          element={RequireUser(<DepartmentPage user={user} onLogout={handleLogout} />, ['Student', 'Faculty'])}
        />
        <Route
          path="/dashboard/department/:deptId/:typeId"
          element={RequireUser(<ResourceListPage user={user} onLogout={handleLogout} />, ['Student', 'Faculty'])}
        />
        <Route
          path="/dashboard/book/:resourceId"
          element={RequireUser(<BookingFormPage user={user} onLogout={handleLogout} />, ['Student', 'Faculty'])}
        />
        <Route
          path="/dashboard/bookings"
          element={RequireUser(<BookingStatusPage user={user} onLogout={handleLogout} />, ['Student', 'Faculty'])}
        />
        <Route
          path="/dashboard/search"
          element={RequireUser(
            <ErrorBoundary>
              <SearchResourcesPage user={user} onLogout={handleLogout} />
            </ErrorBoundary>,
            ['Student', 'Faculty']
          )}
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={RequireUser(<AdminDashboardPage user={user} onLogout={handleLogout} />, ['Admin'])}
        />
        <Route
          path="/admin/map"
          element={RequireUser(<AdminMapPage user={user} onLogout={handleLogout} />, ['Admin'])}
        />
        <Route
          path="/admin/reports"
          element={RequireUser(<AdminReportsPage user={user} onLogout={handleLogout} />, ['Admin'])}
        />
        <Route
          path="/admin/users"
          element={RequireUser(<AdminUsersPage user={user} onLogout={handleLogout} />, ['Admin'])}
        />
        <Route
          path="/admin/audit-logs"
          element={RequireUser(<AdminAuditLogsPage user={user} onLogout={handleLogout} />, ['Admin'])}
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* Global Toast Notification */}
      {user && (
        <ToastNotification 
          notification={toastData} 
          onClose={() => setToastData(null)} 
          user={user}
        />
      )}
    </>
  );
}
