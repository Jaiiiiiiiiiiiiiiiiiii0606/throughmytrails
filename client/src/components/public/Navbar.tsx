import { useRef } from 'react';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { waLink } from '../../lib/format';

export function Navbar({ whatsapp }: { whatsapp: string }) {
  const bar = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  useScrollProgress(bar, nav);

  return (
    <>
      <div className="progress" ref={bar} aria-hidden="true" />
      <header className="nav" ref={nav}>
        <div className="wrap nav-inner">
          <a href="#top" className="brand" aria-label="Through My Trails, back to top">
            <img src="/assets/emblem.png" alt="" width={46} height={41} />
            <span className="script">Through My Trails</span>
          </a>
          <nav className="nav-links" aria-label="Sections">
            <a className="link" href="#services">Services</a>
            <a className="link" href="#trips">Trips</a>
            <a className="link" href="#how">How it works</a>
            <a className="link" href="#contact">Contact</a>
          </nav>
          <a className="btn dark" href={waLink(whatsapp)} target="_blank" rel="noopener noreferrer">
            Plan my trip
          </a>
        </div>
      </header>
    </>
  );
}
