import { useEffect, useRef } from 'react';

/**
 * One passive scroll/resize listener and one requestAnimationFrame per frame, shared by every
 * scroll-driven effect on the page (same approach as the original site's tick/update loop).
 */
type Frame = (vh: number) => void;

const subscribers = new Set<Frame>();
let raf = 0;
let listening = false;

function run() {
  raf = 0;
  const vh = window.innerHeight;
  subscribers.forEach((fn) => fn(vh));
}

export function requestFrame() {
  if (!raf) raf = requestAnimationFrame(run);
}

function start() {
  if (listening) return;
  listening = true;
  window.addEventListener('scroll', requestFrame, { passive: true, capture: true });
  window.addEventListener('resize', requestFrame);
}

function stop() {
  if (!listening || subscribers.size) return;
  listening = false;
  window.removeEventListener('scroll', requestFrame, { capture: true });
  window.removeEventListener('resize', requestFrame);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

/** Calls `fn(viewportHeight)` on mount and once per animation frame while scrolling or resizing. */
export function useScrollFrame(fn: Frame, enabled = true) {
  const ref = useRef(fn);
  ref.current = fn;

  useEffect(() => {
    if (!enabled) return;
    const sub: Frame = (vh) => ref.current(vh);
    subscribers.add(sub);
    start();
    requestFrame();
    return () => {
      subscribers.delete(sub);
      stop();
    };
  }, [enabled]);
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
