import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { uploadMedia, useMedia } from '../../../api/admin';
import { ApiError, assetUrl } from '../../../api/client';
import type { MediaItem } from '../../../api/types';
import { UploadIcon } from '../../../components/admin/AdminIcons';
import { Modal } from '../../../components/admin/Overlay';
import { useToast } from '../../../components/admin/Toast';
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_MB } from '../../../lib/constants';

interface Props {
  open: boolean;
  title: string;
  current?: string;
  onClose: () => void;
  /** Receives the chosen image; `item` carries its URL for previews. */
  onPick: (mediaId: string, item?: MediaItem) => void;
  busy?: boolean;
}

export function MediaPicker({ open, title, current, onClose, onPick, busy }: Props) {
  const { data, isLoading } = useMedia();
  const [sel, setSel] = useState<string | undefined>(current);
  const [progress, setProgress] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const toast = useToast();
  useEffect(() => setSel(current), [current, open]);

  const pick = (id: string) => onPick(id, data?.find((m) => m.id === id));

  // Upload straight from the picker and use the new image right away.
  const upload = async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return toast('Only JPG, PNG and WebP images are allowed.', 'error');
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return toast(`That image is larger than ${MAX_UPLOAD_MB} MB.`, 'error');
    setProgress(0);
    try {
      const [item] = await uploadMedia([file], [file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')], setProgress);
      await qc.invalidateQueries({ queryKey: ['admin', 'media'] });
      if (item) {
        setSel(item.id);
        onPick(item.id, item);
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Upload failed.', 'error');
    } finally {
      setProgress(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      {isLoading ? (
        <div className="skeleton" style={{ height: 200, marginBottom: 20 }} />
      ) : !data?.length ? (
        <p>Your library is empty. Upload a photo below to get started.</p>
      ) : (
        <div className="picker-grid" role="group" aria-label="Images">
          {data.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={sel === m.id}
              aria-label={m.alt || m.originalName}
              onClick={() => setSel(m.id)}
              onDoubleClick={() => pick(m.id)}
            >
              <img src={assetUrl(m.url)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn ghost sm" style={{ marginRight: 'auto' }} onClick={() => input.current?.click()} disabled={progress !== null}>
          {progress !== null ? <span className="spinner" aria-hidden="true" /> : <UploadIcon size={16} />}
          {progress !== null ? `Uploading ${Math.round(progress * 100)}%` : 'Upload new photo'}
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = '';
          }}
        />
        <button type="button" className="btn line sm" onClick={onClose}>Cancel</button>
        <button type="button" className="btn dark sm" disabled={!sel || sel === current || busy} onClick={() => sel && pick(sel)}>
          {busy && <span className="spinner" aria-hidden="true" />}
          Use this image
        </button>
      </div>
    </Modal>
  );
}
