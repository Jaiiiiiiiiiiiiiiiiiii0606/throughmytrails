import { useEffect, useState } from 'react';
import { useMedia } from '../../../api/admin';
import { assetUrl } from '../../../api/client';
import { Modal } from '../../../components/admin/Overlay';

interface Props {
  open: boolean;
  title: string;
  current?: string;
  onClose: () => void;
  onPick: (mediaId: string) => void;
  busy?: boolean;
}

export function MediaPicker({ open, title, current, onClose, onPick, busy }: Props) {
  const { data, isLoading } = useMedia();
  const [sel, setSel] = useState<string | undefined>(current);
  useEffect(() => setSel(current), [current, open]);

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      {isLoading ? (
        <div className="skeleton" style={{ height: 200, marginBottom: 20 }} />
      ) : !data?.length ? (
        <p>Your library is empty. Upload images in the Library tab first.</p>
      ) : (
        <div className="picker-grid" role="group" aria-label="Images">
          {data.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={sel === m.id}
              aria-label={m.alt || m.originalName}
              onClick={() => setSel(m.id)}
              onDoubleClick={() => onPick(m.id)}
            >
              <img src={assetUrl(m.url)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn line sm" onClick={onClose}>Cancel</button>
        <button type="button" className="btn dark sm" disabled={!sel || sel === current || busy} onClick={() => sel && onPick(sel)}>
          {busy && <span className="spinner" aria-hidden="true" />}
          Use this image
        </button>
      </div>
    </Modal>
  );
}
