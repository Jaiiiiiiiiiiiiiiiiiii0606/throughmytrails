import { RefObject, useRef } from 'react';
import { clamp01, useScrollFrame } from './scrollLoop';

/** Drives the gold reading-progress bar, the nav's solid state, and hides the nav while scrolling down. */
export function useScrollProgress(barRef: RefObject<HTMLElement>, navRef: RefObject<HTMLElement>, pinned = false) {
  const last = useRef(0);
  useScrollFrame((vh) => {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    if (barRef.current) barRef.current.style.transform = `scaleX(${clamp01(y / max).toFixed(4)})`;
    const nav = navRef.current;
    if (nav) {
      nav.classList.toggle('solid', y > 40);
      if (Math.abs(y - last.current) > 6) {
        nav.classList.toggle('tucked', !pinned && y > last.current && y > vh * 0.6);
        last.current = y;
      }
    }
  });
}
