import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTraveller } from '../../auth/TravellerAuth';
import { initials } from '../../lib/format';
import { HeartIcon, LogoutIcon, PlaneIcon, UserIcon } from './TIcons';

/** "Sign in" link, or the traveller's avatar with a small menu. */
export function AccountButton({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { status, user, logout } = useTraveller();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (status === 'loading') return <span className={`acct-btn ghost ${tone}`} aria-hidden="true" />;
  if (!user) {
    const next = location.pathname === '/login' ? '' : `?next=${encodeURIComponent(location.pathname + location.search)}`;
    return (
      <Link to={`/login${next}`} className={`acct-signin ${tone}`}>
        <UserIcon size={18} /> <span>Sign in</span>
      </Link>
    );
  }

  return (
    <div className="acct" ref={root}>
      <button type="button" className={`acct-btn ${tone}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label="Your account">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span>{initials(user.name, user.email)}</span>}
      </button>
      {open && (
        <div className="acct-menu" role="menu">
          <div className="acct-who">
            <strong>{user.name || 'Traveller'}</strong>
            <span>{user.email}</span>
          </div>
          <Link role="menuitem" to="/account">
            <PlaneIcon size={18} /> My trips
          </Link>
          <Link role="menuitem" to="/account?tab=saved">
            <HeartIcon size={18} /> Saved places
          </Link>
          <Link role="menuitem" to="/account?tab=profile">
            <UserIcon size={18} /> Profile
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            <LogoutIcon size={18} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
