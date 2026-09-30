import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Traveller } from '../../api/types';
import { useFocusTrap } from '../admin/Overlay';
import { CloseIcon } from '../admin/AdminIcons';
import { SignInPanel } from './SignInPanel';
import '../../theme/traveller.css';

/** The sign-in panel in a modal, opened by `requireSignIn()`. */
export default function SignInDialog({ reason, nameHint, onDone, onCancel }: { reason?: string; nameHint?: string; onDone: (u: Traveller) => void; onCancel: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useFocusTrap(ref, true, onCancel);

  return createPortal(
    <div className="tmodal-root">
      <div className="tmodal-scrim" onClick={onCancel} />
      <div ref={ref} className="tmodal" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}>
        <button type="button" className="tmodal-close" onClick={onCancel} aria-label="Close">
          <CloseIcon size={20} />
        </button>
        <SignInPanel reason={reason} nameHint={nameHint} onDone={(u) => onDone(u)} headingId={id} />
      </div>
    </div>,
    document.body,
  );
}
