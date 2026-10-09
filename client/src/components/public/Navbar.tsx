import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { ImageRef } from '../../api/types';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { waLink } from '../../lib/format';
import { lockScroll } from '../../lib/smoothScroll';
import { Logo } from './Logo';

const LINKS = [
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'trips', label: 'Trips' },
  { id: 'how', label: 'How it works' },
  { id: 'team', label: 'Team' },
  { id: 'contact', label: 'Contact' },
];

/** Id of the section currently occupying the middle of the viewport. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return active;
}

export function Navbar({ whatsapp, logo }: { whatsapp: string; logo: ImageRef | null }) {
  const bar = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const active = useActiveSection(LINKS.map((l) => l.id));
  useScrollProgress(bar, nav, open);

  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => () => lockScroll(false), []);

  return (
    <>
      <div className="progress" ref={bar} aria-hidden="true" />
      <header className={`nav ${open ? 'menu-open' : ''}`} ref={nav}>
        <div className="wrap nav-inner">
          <a href="#top" className="brand" aria-label="Through My Trails, back to top" onClick={() => setOpen(false)}>
            <Logo image={logo} alt="" width={64} height={69} />
          </a>
          <nav className="nav-links" aria-label="Sections">
            {LINKS.map((l) => (
              <a key={l.id} className={`link ${active === l.id ? 'active' : ''}`} href={`#${l.id}`} aria-current={active === l.id ? 'true' : undefined}>
                {active === l.id && (
                  <motion.span layoutId="nav-pill" className="nav-pill" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }} />
                )}
                <span>{l.label}</span>
              </a>
            ))}
          </nav>
          <div className="nav-cta">
            <a className="btn dark" data-magnetic href={waLink(whatsapp)} target="_blank" rel="noopener noreferrer">
              Plan my trip
            </a>
            <button
              type="button"
              className={`burger ${open ? 'x' : ''}`}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((o) => !o)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="mmenu"
            initial={{ clipPath: 'circle(0% at calc(100% - 44px) 44px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 44px) 44px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 44px) 44px)' }}
            transition={{ duration: reduce ? 0 : 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav aria-label="Menu">
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.id}
                  href={`#${l.id}`}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : 0.18 + i * 0.06, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <span className="n">0{i + 1}</span>
                  {l.label}
                </motion.a>
              ))}
            </nav>
            <motion.a
              className="btn dark"
              href={waLink(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.6 }}
            >
              Plan my trip on WhatsApp
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
