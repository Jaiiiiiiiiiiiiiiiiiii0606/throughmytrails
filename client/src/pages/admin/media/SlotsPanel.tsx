import { useMemo, useState } from 'react';
import { useAdminSiteContent, useUpdateSiteContent } from '../../../api/admin';
import { ApiError, assetUrl } from '../../../api/client';
import { useToast } from '../../../components/admin/Toast';
import { TripIllustration } from '../../../components/illustrations/TripIllustration';
import { MediaPicker } from './MediaPicker';
import { COMPANION_SLOT_PREFIX, TRIP_SLOT_PREFIX, slotHelp, slotLabel } from './slots';

function Fallback({ slot, illustration }: { slot: string; illustration?: string }) {
  if (slot === 'about') return <img src="/assets/card.jpg" alt="" />;
  if (slot === 'hero' || slot === 'logo') return <img className="contain" src="/assets/logo-full.png" alt="" />;
  if (slot.startsWith(COMPANION_SLOT_PREFIX)) return <span className="companion-fallback" aria-hidden="true">Illustrated circle</span>;
  return <TripIllustration kind={(illustration ?? 'mountains') as never} />;
}

export function SlotsPanel() {
  const { data, isLoading } = useAdminSiteContent();
  const update = useUpdateSiteContent();
  const toast = useToast();
  const [picking, setPicking] = useState<string | null>(null);

  const tripTitles = useMemo(() => new Map((data?.tripTypes ?? []).map((t) => [t.key, t.title])), [data]);
  const illustrations = useMemo(() => new Map((data?.tripTypes ?? []).map((t) => [t.key, t.illustration])), [data]);

  const assign = async (slot: string, mediaId: string | null) => {
    try {
      await update.mutateAsync({ slots: { [slot]: mediaId } });
      toast(mediaId ? `${slotLabel(slot, tripTitles)} updated. It's live on the site.` : `${slotLabel(slot, tripTitles)} reset to the built-in artwork.`);
      setPicking(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update the slot.', 'error');
    }
  };

  if (isLoading || !data) return <div className="slots">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 300 }} />)}</div>;

  return (
    <>
      <div className="slots">
        {data.slotNames.map((slot) => {
          const img = data.slots[slot];
          return (
            <section className="card slot" key={slot} aria-labelledby={`slot-${slot}`}>
              <div className="preview">
                {img ? (
                  <img className={slot === 'logo' ? 'contain' : ''} src={assetUrl(img.url)} alt={img.alt} />
                ) : (
                  <Fallback slot={slot} illustration={slot.startsWith(TRIP_SLOT_PREFIX) ? illustrations.get(slot.slice(TRIP_SLOT_PREFIX.length)) : undefined} />
                )}
                <span className="tag">{img ? 'Custom image' : 'Built-in'}</span>
              </div>
              <div>
                <h3 id={`slot-${slot}`}>{slotLabel(slot, tripTitles)}</h3>
                <p className="help" style={{ margin: '4px 0 0' }}>{slotHelp(slot)}</p>
              </div>
              <div className="btns">
                <button type="button" className="btn dark sm" onClick={() => setPicking(slot)}>
                  {img ? 'Change image' : 'Choose image'}
                </button>
                {img && (
                  <button type="button" className="btn line sm" onClick={() => assign(slot, null)} disabled={update.isPending}>
                    Reset
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <MediaPicker
        open={!!picking}
        title={picking ? `Choose: ${slotLabel(picking, tripTitles)}` : ''}
        current={picking ? data.slots[picking]?.mediaId : undefined}
        onClose={() => setPicking(null)}
        onPick={(id) => picking && assign(picking, id)}
        busy={update.isPending}
      />
    </>
  );
}
