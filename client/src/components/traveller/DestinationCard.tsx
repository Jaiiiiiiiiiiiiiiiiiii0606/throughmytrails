import { FocusEvent, PointerEvent, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl } from '../../api/client';
import type { DestinationCard as Dest } from '../../api/types';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { formatINRShort } from '../../lib/format';
import { preview, usePreview } from '../../lib/preview';
import { SaveButton } from './SaveButton';
import { PlayIcon } from './TIcons';

interface Props {
  d: Dest;
  /** "arch" = tall arched card (featured rail); "tile" = rounded rectangle (collection rails, grids). */
  variant?: 'arch' | 'tile';
  showPrice?: boolean;
}

const HOVER_INTENT_MS = 140;

/**
 * A destination that comes alive on hover: the photo slowly zooms, the clip fades in and the place's sound plays.
 * Touch devices get a play button instead of hover; keyboard focus works like hover.
 */
export function DestinationCard({ d, variant = 'tile', showPrice }: Props) {
  const uid = useId();
  const { activeId, soundOn } = usePreview();
  const active = activeId === uid;
  const reduce = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const timer = useRef<number>();
  const [playing, setPlaying] = useState(false);
  const hasMedia = !!(d.video || d.audio);

  const start = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => preview.request(uid), HOVER_INTENT_MS);
  };
  const stop = () => {
    window.clearTimeout(timer.current);
    preview.release(uid);
  };

  const onEnter = (e: PointerEvent) => e.pointerType === 'mouse' && !reduce && start();
  const onFocus = (e: FocusEvent) => e.currentTarget === e.target && !reduce && start();

  // Start or stop media when this card becomes (in)active.
  useEffect(() => {
    const v = video.current;
    if (active) {
      if (v && d.video) {
        if (!v.getAttribute('src')) v.src = assetUrl(d.video.url);
        preview.playClip(v, soundOn && !d.audio);
      }
      if (d.audio && soundOn) preview.playAmbient(uid, d.audio.url);
      return;
    }
    setPlaying(false);
    if (d.audio) preview.stopAmbient(uid);
    if (v && !v.paused) {
      const t = window.setTimeout(() => v.pause(), 350);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Sound toggled while this card plays.
  useEffect(() => {
    if (!active) return;
    const v = video.current;
    if (!soundOn) {
      if (v) v.muted = true;
      if (d.audio) preview.stopAmbient(uid, 150);
    } else if (d.audio) preview.playAmbient(uid, d.audio.url);
    else if (v && d.video) preview.playClip(v, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn]);

  useEffect(() => () => preview.release(uid), [uid]);

  const cover = d.cover ? assetUrl(d.cover.url) : undefined;

  return (
    <article
      className={`dcard ${variant} ${active ? 'is-active' : ''} ${playing ? 'is-playing' : ''} ${cover ? '' : 'no-cover'}`}
      onPointerEnter={onEnter}
      onPointerLeave={stop}
    >
      <Link to={`/destinations/${d.slug}`} className="dcard-link" onFocus={onFocus} onBlur={stop} aria-label={`${d.name}${d.tagline ? `: ${d.tagline}` : ''}`}>
        <div className="dcard-media">
          {cover && <img src={cover} alt="" loading="lazy" decoding="async" draggable={false} />}
          {d.video && (
            <video
              ref={video}
              muted
              loop
              playsInline
              preload="none"
              poster={cover}
              onPlaying={() => active && setPlaying(true)}
              aria-hidden="true"
              tabIndex={-1}
            />
          )}
          <span className="dcard-shade" />
        </div>
        <div className="dcard-text">
          {d.tagline && <p className="dcard-tag">{d.tagline}</p>}
          <h3 className={`dcard-name ts-${d.titleStyle}`}>{d.name}</h3>
          {showPrice && d.startingPrice > 0 && <p className="dcard-price">from {formatINRShort(d.startingPrice)} pp</p>}
        </div>
      </Link>
      {active && soundOn && (d.audio || d.video) && (
        <span className="eq" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
      <SaveButton id={d.id} name={d.name} className="dcard-save" />
      {hasMedia && (
        <button
          type="button"
          className="dcard-play"
          aria-label={active ? `Stop the ${d.name} preview` : `Play a preview of ${d.name}`}
          aria-pressed={active}
          onClick={() => (active ? preview.release(uid) : preview.request(uid))}
        >
          <PlayIcon size={14} />
        </button>
      )}
    </article>
  );
}
