import { motion, useReducedMotion } from 'framer-motion';
import { KeyboardEvent, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MediaLibrary } from './media/MediaLibrary';
import { ServicesEditor } from './media/ServicesEditor';
import { SlotsPanel } from './media/SlotsPanel';
import { TripTypesEditor } from './media/TripTypesEditor';

const TABS = [
  { id: 'library', label: 'Library', el: <MediaLibrary /> },
  { id: 'slots', label: 'Image slots', el: <SlotsPanel /> },
  { id: 'trips', label: 'Trip cards', el: <TripTypesEditor /> },
  { id: 'services', label: 'Services', el: <ServicesEditor /> },
] as const;

export default function MediaPage() {
  const [params, setParams] = useSearchParams();
  const reduce = useReducedMotion();
  const active = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'library';
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (id: string) => setParams(id === 'library' ? {} : { tab: id }, { replace: true });

  // Arrow-key navigation between tabs (WAI-ARIA tabs pattern).
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + TABS.length) % TABS.length;
    select(TABS[n].id);
    refs.current[n]?.focus();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <span className="caps">Media & content</span>
          <h1>The look of <em>the trail.</em></h1>
          <p className="sub">Upload photos, choose what appears where, and edit trip cards and services. Changes go live immediately.</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Media and content sections">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            className="tab"
            onClick={() => select(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {active === t.id && <motion.span layoutId="tab-bg" className="tab-bg" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }} />}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {TABS.map((t) =>
        t.id === active ? (
          <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`}>
            {t.el}
          </div>
        ) : null,
      )}
    </>
  );
}
