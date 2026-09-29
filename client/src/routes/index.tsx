import { lazy, Suspense } from 'react';
import { createBrowserRouter, Link, Outlet } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import HomePage from '../pages/public/HomePage';

// The admin bundle (charts, animations) is only downloaded by admins.
const AdminLayout = lazy(() => import('../components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const LoginPage = lazy(() => import('../pages/admin/LoginPage'));
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'));
const EnquiriesPage = lazy(() => import('../pages/admin/EnquiriesPage'));
const MediaPage = lazy(() => import('../pages/admin/MediaPage'));
const SettingsPage = lazy(() => import('../pages/admin/SettingsPage'));

function Loading() {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--label)' }} role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function AdminRoot() {
  return (
    <AuthProvider>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
      <div>
        <p className="script" style={{ fontSize: 56, color: 'var(--gold-text)', margin: 0 }}>Off the map</p>
        <h1 className="serif" style={{ fontSize: 44, margin: '8px 0 20px' }}>This trail doesn't exist.</h1>
        <Link to="/" className="btn dark">Back to the website</Link>
      </div>
    </main>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  {
    path: '/admin',
    element: <AdminRoot />,
    children: [
      { path: 'login', element: <LoginPage /> },
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Suspense fallback={<Loading />}><DashboardPage /></Suspense> },
          { path: 'enquiries', element: <Suspense fallback={<Loading />}><EnquiriesPage /></Suspense> },
          { path: 'enquiries/:id', element: <Suspense fallback={<Loading />}><EnquiriesPage /></Suspense> },
          { path: 'media', element: <Suspense fallback={<Loading />}><MediaPage /></Suspense> },
          { path: 'settings', element: <Suspense fallback={<Loading />}><SettingsPage /></Suspense> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
], {
  future: { v7_relativeSplatPath: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true, v7_partialHydration: true, v7_skipActionErrorRevalidation: true },
});
