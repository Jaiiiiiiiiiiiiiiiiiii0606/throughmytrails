import { assetUrl } from '../../api/client';
import type { CompanionCard } from '../../api/types';
import { COMPANION_LABELS, COMPANIONS, Companion } from '../../lib/constants';

const FALLBACK: Record<Companion, { a: string; b: string; glyph: string }> = {
  couple: { a: '#c98b6b', b: '#8a4f3a', glyph: '♥' },
  family: { a: '#9fb07a', b: '#566b3a', glyph: '⌂' },
  friends: { a: '#d8a657', b: '#9a6a22', glyph: '✦' },
  solo: { a: '#7aa3b8', b: '#3d6478', glyph: '➶' },
  seniors: { a: '#b79bc4', b: '#6f4f80', glyph: '❀' },
};

interface Props {
  companions?: CompanionCard[];
  value?: Companion | null;
  onPick: (c: Companion) => void;
  /** "band" = big round photos on the dark band; "cards" = compact selectable cards in the planner. */
  variant?: 'band' | 'cards';
  blurbs?: Record<Companion, string>;
}

/** "Who's coming along": five round photos (admin-set), or a warm illustrated circle until one is uploaded. */
export function CompanionPicker({ companions, value, onPick, variant = 'band', blurbs }: Props) {
  const list: CompanionCard[] = companions?.length ? companions : COMPANIONS.map((key) => ({ key, label: COMPANION_LABELS[key], image: null }));
  return (
    <div className={`companions v-${variant}`} role={variant === 'cards' ? 'radiogroup' : 'list'} aria-label="Who's coming along">
      {list.map((c) => {
        const f = FALLBACK[c.key];
        const selected = value === c.key;
        return (
          <button
            key={c.key}
            type="button"
            className={`companion ${selected ? 'on' : ''}`}
            onClick={() => onPick(c.key)}
            role={variant === 'cards' ? 'radio' : 'listitem'}
            aria-checked={variant === 'cards' ? selected : undefined}
          >
            <span className="companion-photo" style={{ ['--ca' as string]: f.a, ['--cb' as string]: f.b }}>
              {c.image ? <img src={assetUrl(c.image.url)} alt="" loading="lazy" /> : <span className="companion-glyph" aria-hidden="true">{f.glyph}</span>}
            </span>
            <span className="companion-label">{c.label}</span>
            {blurbs && <span className="companion-blurb">{blurbs[c.key]}</span>}
          </button>
        );
      })}
    </div>
  );
}
