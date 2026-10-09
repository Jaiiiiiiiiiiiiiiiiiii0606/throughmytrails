import { motion, MotionValue, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

/** A paragraph whose words light up one by one as it scrolls through the viewport. */
export function ScrollText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.88', 'end 0.5'] });
  const words = text.split(' ');

  if (reduce) return <p className={className}>{text}</p>;
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w}
        </Word>
      ))}
    </p>
  );
}
