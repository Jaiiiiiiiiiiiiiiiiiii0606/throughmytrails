import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from 'framer-motion';
import { Fragment, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const TOP = ['Explore', 'Experience', 'Everywhere', 'Flights', 'Hotels', 'Holidays', 'Custom packages'];
const BOTTOM = ['Mountains', 'Beaches', 'City breaks', 'Backpacking', 'Sail & sea', 'Honeymoons', 'Scenic escapes'];

const wrap = (min: number, max: number, v: number) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};

/** One endless row that drifts on its own and speeds up (or reverses) with scroll velocity. */
function Row({ words, speed, outline }: { words: string[]; speed: number; outline?: boolean }) {
  const reduce = useReducedMotion();
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocity, [0, 1000], [0, 4], { clamp: false });
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`);
  const dir = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let move = dir.current * speed * (delta / 1000);
    const f = factor.get();
    if (f < 0) dir.current = -1;
    else if (f > 0) dir.current = 1;
    move += dir.current * move * f;
    base.set(base.get() + move);
  });

  // Two identical halves so wrapping at -50% loops seamlessly.
  return (
    <div className={`marquee-row ${outline ? 'outline' : ''}`}>
      <motion.div className="marquee-track" style={{ x }}>
        {[0, 1].map((half) => (
          <Fragment key={half}>
            {words.map((w) => (
              <Fragment key={w}>
                <span>{w}</span>
                <span className="star">✦</span>
              </Fragment>
            ))}
          </Fragment>
        ))}
      </motion.div>
    </div>
  );
}

export function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <Row words={TOP} speed={-2.2} />
      <Row words={BOTTOM} speed={1.6} outline />
    </div>
  );
}
