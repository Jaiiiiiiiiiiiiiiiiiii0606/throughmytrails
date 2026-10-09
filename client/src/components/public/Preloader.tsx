import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ImageRef } from '../../api/types';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Logo } from './Logo';

const KEY = 'tmt-intro-seen';

function seen() {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Brief brand intro on the first visit of a session: the logo draws in, then a curtain lifts. */
export function Preloader({ logo, onDone }: { logo: ImageRef | null; onDone: () => void }) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(() => !reduce && !seen());

  useEffect(() => {
    if (!show) {
      onDone();
      return;
    }
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* storage blocked: the intro simply plays again next time */
    }
    const t = setTimeout(() => setShow(false), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div
          className="preloader"
          aria-hidden="true"
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="preloader-mark">
            <svg viewBox="0 0 200 200">
              <motion.circle
                cx="100"
                cy="100"
                r="96"
                fill="none"
                stroke="#B08654"
                strokeWidth="1.2"
                initial={{ pathLength: 0, rotate: -90 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.3, ease: [0.65, 0, 0.35, 1] }}
                style={{ originX: '50%', originY: '50%' }}
              />
            </svg>
            <motion.div
              initial={{ opacity: 0, scale: 0.86, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Logo image={logo} alt="" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
