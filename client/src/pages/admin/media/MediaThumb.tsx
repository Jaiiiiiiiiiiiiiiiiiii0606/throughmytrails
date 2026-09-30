import { assetUrl } from '../../../api/client';
import type { MediaKind } from '../../../lib/constants';

/** Preview for any library item: the photo, the clip's first frame, or a sound tile. */
export function MediaThumb({ url, kind, alt = '', name }: { url: string; kind: MediaKind; alt?: string; name?: string }) {
  if (kind === 'video') {
    return (
      <span className="mthumb video">
        <video src={`${assetUrl(url)}#t=0.5`} muted playsInline preload="metadata" aria-hidden="true" />
        <span className="mthumb-badge">▶ Clip</span>
      </span>
    );
  }
  if (kind === 'audio') {
    return (
      <span className="mthumb audio">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <span className="mthumb-name">{name ?? 'Sound'}</span>
        <span className="mthumb-badge">♪ Sound</span>
      </span>
    );
  }
  return <img className="mthumb-img" src={assetUrl(url)} alt={alt} loading="lazy" />;
}
