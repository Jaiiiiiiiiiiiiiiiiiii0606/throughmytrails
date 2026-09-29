import { useQueryClient } from '@tanstack/react-query';
import { DragEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { uploadMedia, useDeleteMedia, useMedia, useUpdateMedia } from '../../../api/admin';
import { ApiError, assetUrl } from '../../../api/client';
import type { MediaItem } from '../../../api/types';
import { CheckIcon, CopyIcon, TrashIcon, UploadIcon } from '../../../components/admin/AdminIcons';
import { ConfirmDialog } from '../../../components/admin/Overlay';
import { useToast } from '../../../components/admin/Toast';
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_MB } from '../../../lib/constants';
import { formatBytes, formatDate } from '../../../lib/format';
import { slotLabel } from './slots';

interface QueueItem {
  key: string;
  file: File;
  preview: string;
  progress: number;
  state: 'uploading' | 'done' | 'error';
  error?: string;
}

function validate(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Only JPG, PNG and WebP images are allowed.';
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `Larger than ${MAX_UPLOAD_MB} MB.`;
  return null;
}

export function Uploader() {
  const [over, setOver] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const toast = useToast();

  // Free object URLs when the component goes away.
  const queueRef = useRef(queue);
  queueRef.current = queue;
  useEffect(() => () => queueRef.current.forEach((q) => URL.revokeObjectURL(q.preview)), []);

  const patch = (key: string, p: Partial<QueueItem>) => setQueue((qs) => qs.map((q) => (q.key === key ? { ...q, ...p } : q)));

  const add = (files: FileList | File[]) => {
    const items: QueueItem[] = Array.from(files).map((file) => {
      const error = validate(file);
      return {
        key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        state: error ? 'error' : 'uploading',
        error: error ?? undefined,
      };
    });
    setQueue((qs) => [...items, ...qs]);

    const valid = items.filter((i) => i.state === 'uploading');
    Promise.all(
      valid.map((item) =>
        uploadMedia([item.file], [item.file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')], (p) => patch(item.key, { progress: p }))
          .then(() => patch(item.key, { state: 'done', progress: 1 }))
          .catch((e) => patch(item.key, { state: 'error', error: e instanceof ApiError ? e.message : 'Upload failed.' })),
      ),
    ).then(() => {
      qc.invalidateQueries({ queryKey: ['admin', 'media'] });
      if (valid.length) toast(`${valid.length} ${valid.length === 1 ? 'image' : 'images'} processed.`);
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) add(e.dataTransfer.files);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.current?.click();
    }
  };

  const clearFinished = () => {
    queue.filter((q) => q.state !== 'uploading').forEach((q) => URL.revokeObjectURL(q.preview));
    setQueue((qs) => qs.filter((q) => q.state === 'uploading'));
  };

  return (
    <section className="card" aria-labelledby="up-title" style={{ marginBottom: 18 }}>
      <h2 id="up-title">Upload images</h2>
      <p className="card-sub">JPG, PNG or WebP · up to {MAX_UPLOAD_MB} MB each · add several at once.</p>
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        role="button"
        tabIndex={0}
        aria-describedby="up-title"
        onClick={() => input.current?.click()}
        onKeyDown={onKey}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <UploadIcon size={30} />
        <span className="serif">Drop photos here</span>
        <span className="help">or click to choose files</span>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {queue.length > 0 && (
        <>
          <div className="uploads" aria-live="polite">
            {queue.map((q) => (
              <div className="upload-item" key={q.key}>
                <img src={q.preview} alt="" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.file.name}>{q.file.name}</span>
                {q.state === 'error' ? (
                  <span className="field-err">{q.error}</span>
                ) : (
                  <>
                    <div className="progress-track" role="progressbar" aria-label={`Uploading ${q.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(q.progress * 100)}>
                      <span style={{ width: `${Math.round(q.progress * 100)}%` }} />
                    </div>
                    <span className="help">{q.state === 'done' ? '✓ Uploaded' : `${Math.round(q.progress * 100)}%`} · {formatBytes(q.file.size)}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          {queue.some((q) => q.state !== 'uploading') && (
            <button type="button" className="linkish" onClick={clearFinished}>Clear finished</button>
          )}
        </>
      )}
    </section>
  );
}

function MediaCard({ m, onDelete }: { m: MediaItem; onDelete: (m: MediaItem) => void }) {
  const [alt, setAlt] = useState(m.alt);
  const [copied, setCopied] = useState(false);
  const update = useUpdateMedia();
  const toast = useToast();
  useEffect(() => setAlt(m.alt), [m.alt]);

  const copy = async () => {
    const url = new URL(assetUrl(m.url), window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('Could not copy. Your browser blocked clipboard access.', 'error');
    }
  };

  const saveAlt = async () => {
    if (alt.trim() === m.alt) return;
    try {
      await update.mutateAsync({ id: m.id, alt: alt.trim() });
      toast('Alt text saved.');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save alt text.', 'error');
    }
  };

  return (
    <article className="media-card">
      <div className="thumb">
        <img src={assetUrl(m.url)} alt={m.alt} loading="lazy" />
        {m.usedIn.length > 0 && (
          <div className="used">
            {m.usedIn.map((s) => <span key={s}>{slotLabel(s)}</span>)}
          </div>
        )}
      </div>
      <div className="info">
        <span className="name" title={m.originalName}>{m.originalName}</span>
        <span>
          {m.width && m.height ? `${m.width}×${m.height} · ` : ''}
          {formatBytes(m.size)} · {formatDate(m.createdAt)}
        </span>
        <div className="row">
          <label htmlFor={`alt-${m.id}`} className="sr-only">Alt text for {m.originalName}</label>
          <input
            id={`alt-${m.id}`}
            className="input"
            placeholder="Describe the image (alt text)"
            value={alt}
            maxLength={200}
            onChange={(e) => setAlt(e.target.value)}
            onBlur={saveAlt}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          />
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn ghost sm" onClick={copy} aria-label={`Copy URL of ${m.originalName}`}>
            {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />} {copied ? 'Copied' : 'Copy URL'}
          </button>
          <button type="button" className="icon-btn" onClick={() => onDelete(m)} aria-label={`Delete ${m.originalName}`} title="Delete">
            <TrashIcon size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function MediaLibrary() {
  const { data, isLoading } = useMedia();
  const del = useDeleteMedia();
  const toast = useToast();
  const [pending, setPending] = useState<MediaItem | null>(null);

  const confirmDelete = async () => {
    if (!pending) return;
    try {
      await del.mutateAsync({ id: pending.id, force: pending.usedIn.length > 0 });
      toast('Image deleted.');
      setPending(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not delete the image.', 'error');
    }
  };

  return (
    <>
      <Uploader />
      <section aria-labelledby="lib-title">
        <h2 id="lib-title" className="serif" style={{ fontSize: 28, margin: '8px 0 14px', fontWeight: 600 }}>
          Library {data ? <span className="help" style={{ fontFamily: 'var(--font-sans)', fontSize: 15 }}>· {data.length} images</span> : null}
        </h2>
        {isLoading ? (
          <div className="media-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 280 }} />)}</div>
        ) : !data?.length ? (
          <div className="card empty">
            <span className="script">An empty album</span>
            Upload photos above, then assign them to the website in “Image slots”.
          </div>
        ) : (
          <div className="media-grid">
            {data.map((m) => <MediaCard key={m.id} m={m} onDelete={setPending} />)}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!pending}
        title="Delete this image?"
        message={
          pending?.usedIn.length
            ? `This image is currently shown on the website (${pending.usedIn.map((s) => slotLabel(s)).join(', ')}). Deleting it resets those spots to the built-in artwork. The file is removed permanently.`
            : 'The file will be removed from the server permanently.'
        }
        confirmLabel={pending?.usedIn.length ? 'Delete anyway' : 'Delete'}
        danger
        busy={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
