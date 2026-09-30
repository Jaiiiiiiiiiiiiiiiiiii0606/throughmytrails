import { useEffect, useState } from 'react';
import { useMedia } from '../../../api/admin';
import { Modal } from '../../../components/admin/Overlay';
import type { MediaKind } from '../../../lib/constants';
import { MediaThumb } from './MediaThumb';

interface Props {
  open: boolean;
  title: string;
  current?: string;
  onClose: () => void;
  onPick: (mediaId: string) => void;
  busy?: boolean;
  /** Only show items of this kind (default: photos). */
  kind?: MediaKind;
}

const EMPTY_TEXT: Record<MediaKind, string> = {
  image: 'No photos in your library yet. Upload them in Media & content → Library first.',
  video: 'No clips in your library yet. Upload a short MP4 or WebM in Media & content → Library first.',
  audio: 'No sounds in your library yet. Upload an MP3 or M4A in Media & content → Library first.',
};

export function MediaPicker({ open, title, current, onClose, onPick, busy, kind = 'image' }: Props) {
  const { data: all, isLoading } = useMedia();
  const data = all?.filter((m) => (m.kind ?? 'image') === kind);
  const [sel, setSel] = useState<string | undefined>(current);
  useEffect(() => setSel(current), [current, open]);

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      {isLoading ? (
        <div className="skeleton" style={{ height: 200, marginBottom: 20 }} />
      ) : !data?.length ? (
        <p>{EMPTY_TEXT[kind]}</p>
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
              <MediaThumb url={m.url} kind={m.kind ?? 'image'} name={m.originalName} />
            </button>
          ))}
        </div>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn line sm" onClick={onClose}>Cancel</button>
        <button type="button" className="btn dark sm" disabled={!sel || sel === current || busy} onClick={() => sel && onPick(sel)}>
          {busy && <span className="spinner" aria-hidden="true" />}
          Use this {kind === 'image' ? 'photo' : kind === 'video' ? 'clip' : 'sound'}
        </button>
      </div>
    </Modal>
  );
}
