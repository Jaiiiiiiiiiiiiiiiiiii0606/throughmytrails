import { RefObject } from 'react';
import { clamp01, useScrollFrame } from './scrollLoop';
import { useReducedMotion } from './useReducedMotion';

/**
 * Hero parallax: each `[data-speed]` layer moves down at `scrollY * speed`,
 * and the `[data-fade]` copy drifts and fades out.
 */
export function useParallax(rootRef: RefObject<HTMLElement>) {
  const reduce = useReducedMotion();
  useScrollFrame((vh) => {
    const root = rootRef.current;
    if (!root) return;
    const y = Math.max(0, window.scrollY);
    if (y > vh * 1.5) return; // hero is off-screen; skip work
    root.querySelectorAll<HTMLElement | SVGElement>('[data-speed]').forEach((el) => {
      const s = parseFloat(el.getAttribute('data-speed') || '0');
      el.style.transform = `translate3d(0,${(y * s).toFixed(1)}px,0)`;
    });
    const copy = root.querySelector<HTMLElement>('[data-fade]');
    if (copy) {
      copy.style.transform = `translate3d(0,${(y * 0.3).toFixed(1)}px,0)`;
      copy.style.opacity = String(clamp01(1 - y / (vh * 0.8)));
    }
  }, !reduce);
}

/** Moves an element relative to its distance from the viewport centre (the About card drift). */
export function useLocalParallax(ref: RefObject<HTMLElement>, speed: number) {
  const reduce = useReducedMotion();
  useScrollFrame((vh) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    const off = (r.top + r.height / 2 - vh / 2) * speed;
    el.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
  }, !reduce);
}
