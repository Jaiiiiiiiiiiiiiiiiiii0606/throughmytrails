import { KeyboardEvent, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetUrl } from '../../api/client';
import type { DestinationCard } from '../../api/types';
import { SearchIcon, SparkIcon } from './TIcons';

interface Props {
  destinations: DestinationCard[];
  placeholder?: string;
  /** Called instead of navigating (used by the planner). */
  onPick?: (d: DestinationCard) => void;
  /** Called with free text when nothing in the catalogue matches. */
  onFreeText?: (text: string) => void;
  autoFocus?: boolean;
  className?: string;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

type Option = { kind: 'dest'; d: DestinationCard; via?: string } | { kind: 'free'; text: string };

/** Accessible combobox over destinations, their countries and the cities inside them. */
export function DestinationSearch({ destinations, placeholder = 'Search destinations, countries or cities', onPick, onFreeText, autoFocus, className = '' }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const navigate = useNavigate();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  const options = useMemo<Option[]>(() => {
    const term = norm(q.trim());
    if (!term) return destinations.slice(0, 6).map((d) => ({ kind: 'dest', d }));
    const scored: { o: Option; score: number }[] = [];
    for (const d of destinations) {
      const name = norm(d.name);
      const city = d.cities.find((c) => norm(c.name).includes(term));
      let score = -1;
      if (name.startsWith(term)) score = 0;
      else if (name.includes(term)) score = 1;
      else if (norm(d.country).includes(term)) score = 2;
      else if (city) score = 3;
      else if (norm(`${d.tagline} ${d.summary}`).includes(term)) score = 4;
      if (score >= 0) scored.push({ o: { kind: 'dest', d, via: score === 3 ? city!.name : undefined }, score });
    }
    const list: Option[] = scored.sort((a, b) => a.score - b.score).slice(0, 7).map((s) => s.o);
    if (q.trim().length >= 2) list.push({ kind: 'free', text: q.trim() });
    return list;
  }, [q, destinations]);

  const choose = (o: Option | undefined) => {
    if (!o) return;
    setOpen(false);
    if (o.kind === 'dest') {
      if (onPick) onPick(o.d);
      else navigate(`/destinations/${o.d.slug}`);
      setQ(onPick ? '' : o.d.name);
    } else if (onFreeText) onFreeText(o.text);
    else navigate(`/plan?to=${encodeURIComponent(o.text)}`);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHi((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      if (!open && !q.trim()) return;
      e.preventDefault();
      choose(options[hi]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const listId = `${id}-list`;
  const optId = (i: number) => `${id}-opt-${i}`;

  return (
    <div className={`dsearch ${open && options.length ? 'open' : ''} ${className}`}>
      <SearchIcon size={22} className="dsearch-icon" />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[hi] ? optId(hi) : undefined}
        aria-label="Search destinations"
        placeholder={placeholder}
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKey}
      />
      {open && options.length > 0 && (
        <ul className="dsearch-list" role="listbox" id={listId}>
          {!q.trim() && <li className="dsearch-hint" role="presentation">Popular right now</li>}
          {options.map((o, i) => (
            <li
              key={o.kind === 'dest' ? o.d.id : 'free'}
              id={optId(i)}
              role="option"
              aria-selected={i === hi}
              className={i === hi ? 'hi' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHi(i)}
              onClick={() => choose(o)}
            >
              {o.kind === 'dest' ? (
                <>
                  <span className="dsearch-thumb">{o.d.cover && <img src={assetUrl(o.d.cover.url)} alt="" loading="lazy" />}</span>
                  <span className="dsearch-main">
                    <strong>{o.d.name}</strong>
                    <span>{o.via ? `Includes ${o.via}` : o.d.country !== o.d.name ? o.d.country : o.d.tagline}</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="dsearch-thumb free"><SparkIcon size={18} /></span>
                  <span className="dsearch-main">
                    <strong>Plan a trip to “{o.text}”</strong>
                    <span>We plan anywhere, not just what's listed</span>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
