import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, label';

/** A soft ring that trails the mouse and grows over anything clickable. The native cursor stays visible. */
export function Cursor() {
  const reduce = useReducedMotion();
  const [fine] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 450, damping: 38, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 450, damping: 38, mass: 0.6 });
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!fine || reduce) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      setHover(!!(e.target as Element | null)?.closest?.(INTERACTIVE));
    };
    const leave = () => setVisible(false);
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [fine, reduce, x, y]);

  if (!fine || reduce) return null;
  return <motion.div className={`cursor ${hover ? 'hover' : ''} ${visible ? 'on' : ''}`} style={{ x: sx, y: sy }} aria-hidden="true" />;
}
