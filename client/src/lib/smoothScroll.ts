import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/** The page's single Lenis instance, so overlays (e.g. the mobile menu) can pause scrolling. */
let lenis: Lenis | null = null;

export function startSmoothScroll() {
  if (lenis) return lenis;
  lenis = new Lenis({ duration: 1.15, autoRaf: true, anchors: { offset: -84 } });
  return lenis;
}

export function stopSmoothScroll() {
  lenis?.destroy();
  lenis = null;
}

export function lockScroll(locked: boolean) {
  if (locked) lenis?.stop();
  else lenis?.start();
  document.documentElement.style.overflow = locked ? 'hidden' : '';
}

/** Smoothly brings `el` to the top of the viewport, through Lenis when it is running. */
export function scrollToElement(el: HTMLElement) {
  if (lenis) lenis.scrollTo(el, { offset: -90 });
  else el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}
