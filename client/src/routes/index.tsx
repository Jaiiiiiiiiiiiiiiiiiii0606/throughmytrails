import { lazy, Suspense } from 'react';
import { createBrowserRouter, Link, Outlet, ScrollRestoration } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import HomePage from '../pages/public/HomePage';

// The admin bundle (charts, animations) is only downloaded by admins.
const AdminLayout = lazy(() => import('../components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const LoginPage = lazy(() => import('../pages/admin/LoginPage'));
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'));
const EnquiriesPage = lazy(() => import('../pages/admin/EnquiriesPage'));
const MediaPage = lazy(() => import('../pages/admin/MediaPage'));
const SettingsPage = lazy(() => import('../pages/admin/SettingsPage'));
const DestinationsPage = lazy(() => import('../pages/admin/DestinationsPage'));
const DestinationEditor = lazy(() => import('../pages/admin/DestinationEditor'));
const PackagesPage = lazy(() => import('../pages/admin/PackagesPage'));
const PackageEditor = lazy(() => import('../pages/admin/PackageEditor'));
const TravellersPage = lazy(() => import('../pages/admin/TravellersPage'));

// Traveller pages.
const ExplorePage = lazy(() => import('../pages/traveller/ExplorePage'));
const DestinationPage = lazy(() => import('../pages/traveller/DestinationPage'));
const PackagePage = lazy(() => import('../pages/traveller/PackagePage'));
const PlannerPage = lazy(() => import('../pages/traveller/PlannerPage'));
const TravellerLoginPage = lazy(() => import('../pages/traveller/LoginPage'));
const AccountPage = lazy(() => import('../pages/traveller/AccountPage'));

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

/** Public pages: scroll to top on navigation (and restore on back), lazy pages behind one spinner. */
function PublicRoot() {
  return (
    <>
      <ScrollRestoration getKey={(l) => l.pathname} />
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </>
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

const wrap = (el: JSX.Element) => <Suspense fallback={<Loading />}>{el}</Suspense>;

export const router = createBrowserRouter([
  {
    element: <PublicRoot />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/destinations/:slug', element: <DestinationPage /> },
      { path: '/packages/:slug', element: <PackagePage /> },
      { path: '/plan', element: <PlannerPage /> },
      { path: '/login', element: <TravellerLoginPage /> },
      { path: '/account', element: <AccountPage /> },
    ],
  },
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
          { path: 'destinations', element: wrap(<DestinationsPage />) },
          { path: 'destinations/:id', element: wrap(<DestinationEditor />) },
          { path: 'packages', element: wrap(<PackagesPage />) },
          { path: 'packages/:id', element: wrap(<PackageEditor />) },
          { path: 'travellers', element: wrap(<TravellersPage />) },
          { path: 'travellers/:id', element: wrap(<TravellersPage />) },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
], {
  future: { v7_relativeSplatPath: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true, v7_partialHydration: true, v7_skipActionErrorRevalidation: true },
});
