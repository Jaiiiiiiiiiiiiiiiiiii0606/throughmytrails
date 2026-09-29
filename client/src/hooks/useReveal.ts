import { RefObject, useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Adds `.in` to every `.rv` element inside `rootRef` the first time it scrolls into view.
 * Re-scans whenever `deps` change so content loaded from the API also animates.
 */
export function useReveal(rootRef: RefObject<HTMLElement>, deps: unknown[] = []) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('.rv:not(.in)'));
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootRef, reduce, ...deps]);
}
