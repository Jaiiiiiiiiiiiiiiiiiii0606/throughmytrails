import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStats } from '../../api/admin';
import { useAuth } from '../../auth/AuthContext';
import '../../theme/admin.css';
import { DashIcon, ExternalIcon, GearIcon, ImageIcon, InboxIcon, LogoutIcon, MapPinIcon, MenuIcon, SuitcaseIcon, UsersIcon } from './AdminIcons';
import { ToastProvider } from './Toast';

function Brand() {
  return (
    <Link to="/admin" className="side-brand">
      <img src="/assets/emblem.png" alt="" width={44} height={39} />
      <span>
        <span className="script">Through My Trails</span>
        <span className="caps">Admin</span>
      </span>
    </Link>
  );
}

function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { user, logout } = useAuth();
  const { data } = useStats();
  const fresh = data?.totals.new ?? 0;
  const link = ({ isActive }: { isActive: boolean }) => `side-link ${isActive ? 'active' : ''}`;

  return (
    <aside className={`side ${open ? 'open' : ''}`} id="admin-sidebar" aria-label="Admin navigation">
      <Brand />
      <nav>
        <NavLink to="/admin" end className={link} onClick={onNavigate}>
          <DashIcon /> Dashboard
        </NavLink>
        <NavLink to="/admin/enquiries" className={link} onClick={onNavigate}>
          <InboxIcon /> Enquiries
          {fresh > 0 && <span className="count" aria-label={`${fresh} new`}>{fresh}</span>}
        </NavLink>
        <NavLink to="/admin/destinations" className={link} onClick={onNavigate}>
          <MapPinIcon /> Destinations
        </NavLink>
        <NavLink to="/admin/packages" className={link} onClick={onNavigate}>
          <SuitcaseIcon /> Packages
        </NavLink>
        <NavLink to="/admin/travellers" className={link} onClick={onNavigate}>
          <UsersIcon /> Travellers
        </NavLink>
        <NavLink to="/admin/media" className={link} onClick={onNavigate}>
          <ImageIcon /> Media & content
        </NavLink>
        <NavLink to="/admin/settings" className={link} onClick={onNavigate}>
          <GearIcon /> Settings
        </NavLink>
      </nav>
      <div className="side-foot">
        <div className="side-user">
          <strong>{user?.name}</strong>
          {user?.email}
        </div>
        <a className="linkish" href="/" target="_blank" rel="noopener noreferrer">
          <ExternalIcon size={16} /> View website
        </a>
        <button type="button" className="linkish" onClick={logout}>
          <LogoutIcon size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}

export function AdminLayout() {
  const { status } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    document.title = 'Admin · Through My Trails';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  if (status === 'loading') {
    return (
      <div className="boot" role="status">
        <span className="spinner" aria-hidden="true" />
        <span className="sr-only">Loading admin…</span>
      </div>
    );
  }
  if (status === 'anon') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return (
    <ToastProvider>
      <div className="admin">
        <a className="skip-link" href="#admin-main">Skip to content</a>
        <div className="topbar">
          <Brand />
          <button
            type="button"
            className="icon-btn"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="admin-sidebar"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon size={22} />
          </button>
        </div>
        <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <AnimatePresence>
          {menuOpen && (
            <motion.div className="scrim" style={{ zIndex: 95 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} />
          )}
        </AnimatePresence>
        <main className="main" id="admin-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  );
}
