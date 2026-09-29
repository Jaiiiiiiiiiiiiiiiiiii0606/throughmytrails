import { RefObject } from 'react';
import { clamp01, useScrollFrame } from './scrollLoop';

/** Drives the gold reading-progress bar and the nav's solid state. */
export function useScrollProgress(barRef: RefObject<HTMLElement>, navRef: RefObject<HTMLElement>) {
  useScrollFrame((vh) => {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    if (barRef.current) barRef.current.style.transform = `scaleX(${clamp01(y / max).toFixed(4)})`;
    navRef.current?.classList.toggle('solid', y > 40);
  });
}
