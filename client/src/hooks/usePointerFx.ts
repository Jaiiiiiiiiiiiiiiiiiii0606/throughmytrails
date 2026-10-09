import { RefObject, useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Pointer-driven polish for mouse users:
 *  • `[data-tilt="8"]` tilts up to 8° toward the cursor and exposes --mx/--my for a spotlight glow.
 *  • `[data-magnetic]` drifts a little toward the cursor.
 * Skipped on touch devices and with reduced motion. Re-scans when `deps` change.
 */
export function usePointerFx(rootRef: RefObject<HTMLElement>, deps: unknown[] = []) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduce || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    const offs: (() => void)[] = [];
    const on = (el: HTMLElement, type: 'pointermove' | 'pointerleave', fn: (e: PointerEvent) => void) => {
      el.addEventListener(type, fn);
      offs.push(() => el.removeEventListener(type, fn));
    };

    root.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt || '8');
      on(el, 'pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        el.style.setProperty('--rx', `${((0.5 - y) * max).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${((x - 0.5) * max).toFixed(2)}deg`);
      });
      on(el, 'pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });

    root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
      on(el, 'pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--tx', `${((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1)}px`);
        el.style.setProperty('--ty', `${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`);
      });
      on(el, 'pointerleave', () => {
        el.style.setProperty('--tx', '0px');
        el.style.setProperty('--ty', '0px');
      });
    });

    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootRef, reduce, ...deps]);
}
