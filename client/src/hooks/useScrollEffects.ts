import { RefObject, useEffect, useRef } from 'react';
import { clamp01, requestFrame, useScrollFrame } from './scrollLoop';
import { useReducedMotion } from './useReducedMotion';

/**
 * Pinned horizontal scroll: the section is made tall enough that scrolling vertically
 * through it slides the track sideways by exactly its overflow.
 */
export function usePinnedScroll(
  pinRef: RefObject<HTMLElement>,
  trackRef: RefObject<HTMLElement>,
  countRef: RefObject<HTMLElement>,
  enabled: boolean,
) {
  const extra = useRef(0);

  useEffect(() => {
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!pin || !track) return;
    if (!enabled) {
      pin.style.height = '';
      track.style.transform = '';
      return;
    }
    const measure = () => {
      extra.current = Math.max(0, track.scrollWidth - window.innerWidth);
      pin.style.height = `${extra.current + window.innerHeight}px`;
      requestFrame();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener('resize', measure);
    // Fonts and images change card widths after first paint.
    window.addEventListener('load', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('load', measure);
    };
  }, [pinRef, trackRef, enabled]);

  useScrollFrame((vh) => {
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!pin || !track) return;
    const r = pin.getBoundingClientRect();
    const total = r.height - vh;
    const p = total > 0 ? clamp01(-r.top / total) : 0;
    track.style.transform = `translate3d(${(-p * extra.current).toFixed(1)}px,0,0)`;
    if (countRef.current) countRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
  }, enabled);
}

/** The "How it works" rail fills as the timeline passes 60% of the viewport. */
export function useTimelineFill(listRef: RefObject<HTMLElement>, fillRef: RefObject<HTMLElement>) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce && fillRef.current) fillRef.current.style.transform = 'scaleY(1)';
  }, [reduce, fillRef]);
  useScrollFrame((vh) => {
    const list = listRef.current;
    const fill = fillRef.current;
    if (!list || !fill) return;
    const r = list.getBoundingClientRect();
    fill.style.transform = `scaleY(${clamp01((vh * 0.6 - r.top) / r.height).toFixed(4)})`;
  }, !reduce);
}

/** "Explore. Experience. Everywhere." grows from 55% to 120% while pinned. */
export function useZoomOnScroll(sectionRef: RefObject<HTMLElement>, textRef: RefObject<HTMLElement>) {
  const reduce = useReducedMotion();
  useScrollFrame((vh) => {
    const s = sectionRef.current;
    const t = textRef.current;
    if (!s || !t) return;
    const r = s.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const p = clamp01(-r.top / Math.max(1, r.height - vh));
    t.style.transform = `scale(${(0.55 + p * 0.65).toFixed(3)})`;
    t.style.opacity = String(0.2 + Math.min(1, p * 2) * 0.8);
  }, !reduce);
}

/** Paper plane flies along the dashed path, drawing the gold trail behind it. */
export function useFlightPath(
  sectionRef: RefObject<HTMLElement>,
  pathRef: RefObject<SVGPathElement>,
  planeRef: RefObject<SVGGElement>,
) {
  const reduce = useReducedMotion();
  const len = useRef(0);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    len.current = path.getTotalLength();
    path.style.strokeDasharray = `${len.current} ${len.current}`;
    if (reduce) {
      path.style.strokeDashoffset = '0';
      const end = path.getPointAtLength(len.current);
      const before = path.getPointAtLength(len.current - 2);
      const ang = (Math.atan2(end.y - before.y, end.x - before.x) * 180) / Math.PI;
      planeRef.current?.setAttribute('transform', `translate(${end.x.toFixed(1)} ${end.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
    }
  }, [pathRef, planeRef, reduce]);

  useScrollFrame((vh) => {
    const s = sectionRef.current;
    const path = pathRef.current;
    const plane = planeRef.current;
    if (!s || !path || !plane || !len.current) return;
    const r = s.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0) return;
    const p = clamp01((vh - r.top) / (r.height * 0.85));
    const L = len.current;
    path.style.strokeDashoffset = String(L * (1 - p));
    const at = L * p;
    const a = path.getPointAtLength(Math.max(0, at - 2));
    const b = path.getPointAtLength(Math.max(2, at));
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    plane.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
  }, !reduce);
}
