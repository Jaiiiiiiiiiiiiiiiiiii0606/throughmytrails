import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CloseIcon, MenuIcon } from '../admin/AdminIcons';
import { AccountButton } from './AccountButton';

/** Header for the Explore, destination, package, planner and account pages. */
export function SiteHeader({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const link = ({ isActive }: { isActive: boolean }) => `shdr-link ${isActive ? 'active' : ''}`;
  return (
    <header className={`shdr ${tone} ${solid ? 'solid' : ''} ${open ? 'menu-open' : ''}`}>
      <div className="shdr-inner">
        <Link to="/" className="shdr-brand" aria-label="Through My Trails home">
          <img src="/assets/emblem.png" alt="" width={40} height={36} />
          <span className="script">Through My Trails</span>
        </Link>
        <nav className="shdr-nav" aria-label="Main">
          <NavLink to="/explore" className={link}>Explore</NavLink>
          <NavLink to="/explore#packages" className={() => 'shdr-link'}>Packages</NavLink>
          <NavLink to="/plan" className={link}>Plan a trip</NavLink>
          <NavLink to="/#how" className={() => 'shdr-link'}>How it works</NavLink>
        </nav>
        <div className="shdr-right">
          <AccountButton tone={tone === 'dark' && !solid ? 'dark' : 'light'} />
          <Link to="/plan" className="btn dark sm shdr-cta">Plan my trip</Link>
          <button type="button" className="shdr-menu" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>
            {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="shdr-sheet" aria-label="Main">
          <Link to="/explore">Explore destinations</Link>
          <Link to="/explore#packages">Holiday packages</Link>
          <Link to="/plan">Plan a trip</Link>
          <Link to="/account">My trips</Link>
          <Link to="/">Home</Link>
        </nav>
      )}
    </header>
  );
}
