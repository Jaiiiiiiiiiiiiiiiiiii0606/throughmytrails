import { AnimatePresence, motion } from 'framer-motion';
import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { CheckIcon, CloseIcon } from './AdminIcons';

type Kind = 'success' | 'error';
interface ToastItem {
  id: number;
  kind: Kind;
  text: string;
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (text: string, kind: Kind = 'success') => {
      const id = nextId.current++;
      setItems((xs) => [...xs.slice(-3), { id, kind, text }]);
      window.setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              className={`toast ${t.kind}`}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            >
              {t.kind === 'success' && <CheckIcon size={18} />}
              <span>{t.text}</span>
              <button type="button" className="icon-btn" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                <CloseIcon size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
