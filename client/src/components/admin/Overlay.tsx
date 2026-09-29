import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ReactNode, RefObject, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open overlays, innermost last: only the top one reacts to keys.
const trapStack: object[] = [];

/** Traps Tab inside `ref`, closes on Escape, and returns focus to the opener on close. */
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!active) return;
    const token = {};
    trapStack.push(token);
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? el)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (trapStack[trapStack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        close.current();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const [f, l] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === f) {
        e.preventDefault();
        l.focus();
      } else if (!e.shiftKey && document.activeElement === l) {
        e.preventDefault();
        f.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      trapStack.splice(trapStack.indexOf(token), 1);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [active, ref]);
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const reduce = useReducedMotion();
  useFocusTrap(ref, open, onClose);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" style={{ zIndex: 105 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref}
            className={`dialog ${wide ? 'wide' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            tabIndex={-1}
            initial={reduce ? { opacity: 0, x: '-50%', y: '-50%' } : { opacity: 0, x: '-50%', y: '-46%', scale: 0.97 }}
            animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
            exit={{ opacity: 0, x: '-50%', y: '-48%', scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <h2 id={id}>{title}</h2>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, busy, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p>{message}</p>
      <div className="dialog-actions">
        <button type="button" className="btn line sm" onClick={onCancel} data-autofocus>
          Cancel
        </button>
        <button type="button" className={`btn sm ${danger ? 'danger' : 'dark'}`} onClick={onConfirm} disabled={busy}>
          {busy && <span className="spinner" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
