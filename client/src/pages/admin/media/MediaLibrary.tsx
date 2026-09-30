import { useQueryClient } from '@tanstack/react-query';
import { DragEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { uploadMedia, useDeleteMedia, useMedia, useUpdateMedia } from '../../../api/admin';
import { ApiError, assetUrl } from '../../../api/client';
import type { MediaItem } from '../../../api/types';
import { CheckIcon, CopyIcon, TrashIcon, UploadIcon } from '../../../components/admin/AdminIcons';
import { ConfirmDialog } from '../../../components/admin/Overlay';
import { useToast } from '../../../components/admin/Toast';
import {
  ACCEPTED_AUDIO_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_AUDIO_MB,
  MAX_UPLOAD_MB,
  MAX_VIDEO_MB,
  MediaKind,
} from '../../../lib/constants';
import { formatBytes, formatDate } from '../../../lib/format';
import { MediaThumb } from './MediaThumb';
import { slotLabel } from './slots';

interface QueueItem {
  key: string;
  file: File;
  preview: string;
  progress: number;
  state: 'uploading' | 'done' | 'error';
  error?: string;
}

function kindOf(file: File): MediaKind | null {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'image';
  if (ACCEPTED_VIDEO_TYPES.includes(file.type)) return 'video';
  if (ACCEPTED_AUDIO_TYPES.includes(file.type)) return 'audio';
  return null;
}

const LIMIT_MB: Record<MediaKind, number> = { image: MAX_UPLOAD_MB, video: MAX_VIDEO_MB, audio: MAX_AUDIO_MB };

function validate(file: File): string | null {
  const kind = kindOf(file);
  if (!kind) return 'Use JPG/PNG/WebP photos, MP4/WebM clips, or MP3/M4A/OGG/WAV sounds.';
  if (file.size > LIMIT_MB[kind] * 1024 * 1024) return `Larger than ${LIMIT_MB[kind]} MB.`;
  return null;
}

const ACCEPT = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_AUDIO_TYPES, '.m4a', '.mp3'].join(',');

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
      if (valid.length) toast(`${valid.length} ${valid.length === 1 ? 'file' : 'files'} processed.`);
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
      <h2 id="up-title">Upload photos, clips and sounds</h2>
      <p className="card-sub">
        Photos: JPG, PNG or WebP up to {MAX_UPLOAD_MB} MB · Hover clips: MP4 or WebM up to {MAX_VIDEO_MB} MB (5–20 seconds, no text, works best) · Ambient sounds: MP3, M4A, OGG or WAV up to {MAX_AUDIO_MB} MB.
      </p>
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
        <span className="serif">Drop files here</span>
        <span className="help">or click to choose files</span>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
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
                {kindOf(q.file) === 'image' ? <img src={q.preview} alt="" /> : <MediaThumb url={q.preview} kind={kindOf(q.file) ?? 'audio'} name={q.file.name} />}
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
        <MediaThumb url={m.url} kind={m.kind ?? 'image'} alt={m.alt} name={m.originalName} />
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
            placeholder={m.kind === 'image' ? 'Describe the image (alt text)' : 'Short description'}
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

const FILTERS: { id: 'all' | MediaKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Photos' },
  { id: 'video', label: 'Clips' },
  { id: 'audio', label: 'Sounds' },
];

export function MediaLibrary() {
  const { data: all, isLoading } = useMedia();
  const [filter, setFilter] = useState<'all' | MediaKind>('all');
  const data = all?.filter((m) => filter === 'all' || (m.kind ?? 'image') === filter);
  const del = useDeleteMedia();
  const toast = useToast();
  const [pending, setPending] = useState<MediaItem | null>(null);

  const confirmDelete = async () => {
    if (!pending) return;
    try {
      await del.mutateAsync({ id: pending.id, force: pending.usedIn.length > 0 });
      toast('File deleted.');
      setPending(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not delete the file.', 'error');
    }
  };

  return (
    <>
      <Uploader />
      <section aria-labelledby="lib-title">
        <h2 id="lib-title" className="serif" style={{ fontSize: 28, margin: '8px 0 14px', fontWeight: 600 }}>
          Library {all ? <span className="help" style={{ fontFamily: 'var(--font-sans)', fontSize: 15 }}>· {all.length} files</span> : null}
        </h2>
        <div className="kind-filter" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={`chip-sm ${filter === f.id ? 'on' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              {all ? ` · ${f.id === 'all' ? all.length : all.filter((m) => (m.kind ?? 'image') === f.id).length}` : ''}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div className="media-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 280 }} />)}</div>
        ) : !data?.length ? (
          <div className="card empty">
            <span className="script">{filter === 'all' ? 'An empty album' : 'Nothing here yet'}</span>
            Upload files above, then use them in “Image slots”, destinations and packages.
          </div>
        ) : (
          <div className="media-grid">
            {data.map((m) => <MediaCard key={m.id} m={m} onDelete={setPending} />)}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!pending}
        title="Delete this file?"
        message={
          pending?.usedIn.length
            ? `This file is currently used on the website (${pending.usedIn.map((s) => slotLabel(s)).join(', ')}). Deleting it removes it from those places (photo slots go back to the built-in artwork). The file is removed permanently.`
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
