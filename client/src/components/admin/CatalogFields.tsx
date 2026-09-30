import { useState } from 'react';
import { useMedia } from '../../api/admin';
import { assetUrl } from '../../api/client';
import type { AdminAsset } from '../../api/types';
import type { MediaKind } from '../../lib/constants';
import { MediaPicker } from '../../pages/admin/media/MediaPicker';
import { MediaThumb } from '../../pages/admin/media/MediaThumb';
import { DownIcon, ImageIcon, PlusIcon, TrashIcon, UpIcon } from './AdminIcons';

const KIND_WORD: Record<MediaKind, string> = { image: 'photo', video: 'clip', audio: 'sound' };
const HTTPS_RX = /^https:\/\/[^\s<>"']+$/;

function AssetPreview({ a, kind }: { a: AdminAsset; kind: MediaKind }) {
  if (kind === 'audio') return <MediaThumb url={a.url} kind="audio" name={a.url.split('/').pop()?.slice(0, 40)} />;
  if (kind === 'video') return <video src={assetUrl(a.url)} muted loop playsInline autoPlay preload="metadata" className="mthumb" />;
  return <img src={assetUrl(a.url)} alt="" className="mthumb-img" />;
}

interface AssetFieldProps {
  label: string;
  help?: string;
  kind: MediaKind;
  value?: AdminAsset | null;
  onChange: (a: AdminAsset | null) => void;
  id: string;
}

/** One photo, clip or sound: pick from the library or paste an https link, with an optional credit line. */
export function AssetField({ label, help, kind, value, onChange, id }: AssetFieldProps) {
  const [picking, setPicking] = useState(false);
  const [linking, setLinking] = useState(false);
  const [link, setLink] = useState('');
  const { data: media } = useMedia();
  const word = KIND_WORD[kind];
  const linkOk = HTTPS_RX.test(link.trim());

  return (
    <div className="asset-field">
      <div className={`asset-preview ${kind}`}>{value ? <AssetPreview a={value} kind={kind} /> : <span className="asset-empty"><ImageIcon size={26} /></span>}</div>
      <div className="asset-body">
        <strong id={`${id}-label`}>{label}</strong>
        {help && <span className="help">{help}</span>}
        {value && !value.media && <span className="help">External link · {new URL(value.url, window.location.origin).hostname}</span>}
        <div className="asset-btns">
          <button type="button" className="btn line sm" onClick={() => setPicking(true)} aria-describedby={`${id}-label`}>
            {value ? `Change ${word}` : `Choose ${word}`}
          </button>
          <button type="button" className="btn ghost sm" onClick={() => setLinking((l) => !l)}>
            Paste a link
          </button>
          {value && (
            <button type="button" className="icon-btn" onClick={() => onChange(null)} aria-label={`Remove ${label.toLowerCase()}`} title="Remove">
              <TrashIcon size={18} />
            </button>
          )}
        </div>
        {linking && (
          <div className="asset-link">
            <input className="input" placeholder={`https://… (${word} URL)`} value={link} onChange={(e) => setLink(e.target.value)} aria-label={`${label} link`} />
            <button
              type="button"
              className="btn dark sm"
              disabled={!linkOk}
              onClick={() => {
                onChange({ url: link.trim(), credit: value?.credit ?? '', alt: value?.alt ?? '' });
                setLink('');
                setLinking(false);
              }}
            >
              Use link
            </button>
          </div>
        )}
        {value && (
          <input
            className="input"
            placeholder="Credit (optional), e.g. Photo: Jane Doe · CC BY 4.0"
            value={value.credit ?? ''}
            maxLength={160}
            onChange={(e) => onChange({ ...value, credit: e.target.value })}
            aria-label={`${label} credit`}
          />
        )}
      </div>
      <MediaPicker
        open={picking}
        kind={kind}
        title={`Choose a ${word}: ${label}`}
        current={value?.media}
        onClose={() => setPicking(false)}
        onPick={(mediaId) => {
          const m = media?.find((x) => x.id === mediaId);
          if (m) onChange({ url: m.url, media: m.id, alt: m.alt, credit: value?.credit ?? '' });
          setPicking(false);
        }}
      />
    </div>
  );
}

/** Ordered list of photos. */
export function GalleryField({ value, onChange, max = 12 }: { value: AdminAsset[]; onChange: (v: AdminAsset[]) => void; max?: number }) {
  const [picking, setPicking] = useState(false);
  const [link, setLink] = useState('');
  const { data: media } = useMedia();
  const move = (i: number, d: -1 | 1) => {
    const n = [...value];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
  };
  return (
    <div className="gallery-field">
      <div className="gallery-grid">
        {value.map((a, i) => (
          <figure key={`${a.url}-${i}`} className="gallery-item">
            <img src={assetUrl(a.url)} alt="" />
            <div className="gallery-tools">
              <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`}><UpIcon size={16} /></button>
              <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label={`Move photo ${i + 1} later`}><DownIcon size={16} /></button>
              <button type="button" className="icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`}><TrashIcon size={16} /></button>
            </div>
            <input className="input" placeholder="Credit (optional)" value={a.credit ?? ''} maxLength={160} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, credit: e.target.value } : x)))} aria-label={`Credit for photo ${i + 1}`} />
          </figure>
        ))}
      </div>
      {value.length < max && (
        <div className="asset-btns">
          <button type="button" className="btn line sm" onClick={() => setPicking(true)}>
            <PlusIcon size={16} /> Add from library
          </button>
          <div className="asset-link">
            <input className="input" placeholder="or paste an https:// photo link" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Photo link" />
            <button
              type="button"
              className="btn ghost sm"
              disabled={!HTTPS_RX.test(link.trim())}
              onClick={() => {
                onChange([...value, { url: link.trim(), alt: '', credit: '' }]);
                setLink('');
              }}
            >
              Add link
            </button>
          </div>
        </div>
      )}
      <MediaPicker
        open={picking}
        title="Add a photo to the gallery"
        onClose={() => setPicking(false)}
        onPick={(mediaId) => {
          const m = media?.find((x) => x.id === mediaId);
          if (m) onChange([...value, { url: m.url, media: m.id, alt: m.alt, credit: '' }]);
          setPicking(false);
        }}
      />
    </div>
  );
}

/** Editable list of short text lines (highlights, inclusions…). */
export function ListEditor({ items, onChange, placeholder, max = 20, label }: { items: string[]; onChange: (v: string[]) => void; placeholder: string; max?: number; label: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || items.length >= max) return;
    onChange([...items, v]);
    setDraft('');
  };
  const move = (i: number, d: -1 | 1) => {
    const n = [...items];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
  };
  return (
    <div className="list-editor">
      {items.length > 0 && (
        <ul>
          {items.map((it, i) => (
            <li key={i}>
              <input className="input" value={it} maxLength={160} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`${label} ${i + 1}`} />
              <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${label} ${i + 1} up`}><UpIcon size={16} /></button>
              <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${label} ${i + 1} down`}><DownIcon size={16} /></button>
              <button type="button" className="icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove ${label} ${i + 1}`}><TrashIcon size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      {items.length < max && (
        <div className="asset-link">
          <input
            className="input"
            placeholder={placeholder}
            value={draft}
            maxLength={160}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            aria-label={`New ${label}`}
          />
          <button type="button" className="btn ghost sm" onClick={add} disabled={!draft.trim()}>
            <PlusIcon size={16} /> Add
          </button>
        </div>
      )}
    </div>
  );
}
