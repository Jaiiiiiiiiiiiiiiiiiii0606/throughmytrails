import { useEffect, useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, assetUrl } from '../../api/client';
import { useDestination, useDestinations, useSiteContent } from '../../api/public';
import { Footer } from '../../components/public/Footer';
import { DestinationCard } from '../../components/traveller/DestinationCard';
import { PackagesSection } from '../../components/traveller/PackagesSection';
import { Rail } from '../../components/traveller/Rail';
import { SaveButton } from '../../components/traveller/SaveButton';
import { SiteHeader } from '../../components/traveller/SiteHeader';
import { ArrowRightIcon, CalendarIcon, MoonIcon, PassportIcon, SoundOffIcon, SoundOnIcon, SunIcon } from '../../components/traveller/TIcons';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { formatINR } from '../../lib/format';
import { preview, usePreview } from '../../lib/preview';
import '../../theme/traveller.css';

export default function DestinationPage() {
  const { slug } = useParams();
  const { data: d, isLoading, error } = useDestination(slug);
  const { data: all } = useDestinations();
  const { content } = useSiteContent();
  const reduce = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const heroId = `hero-${slug}`;
  const { activeId, soundOn } = usePreview();
  const listening = activeId === heroId;
  useDocumentTitle(d?.name);

  // The hero clip loops silently; "Hear it" turns on its sound (or the ambient track) through the shared manager.
  useEffect(() => {
    const v = video.current;
    if (!d) return;
    if (listening && soundOn) {
      if (d.audio) preview.playAmbient(heroId, d.audio.url);
      else if (v) preview.playClip(v, true);
    } else {
      if (v) v.muted = true;
      if (d.audio) preview.stopAmbient(heroId);
    }
  }, [listening, soundOn, d, heroId]);

  useEffect(() => () => preview.release(heroId), [heroId]);

  const similar = useMemo(() => {
    if (!d || !all) return [];
    return all.items.filter((x) => x.id !== d.id && x.collections.some((c) => c !== 'featured' && d.collections.includes(c))).slice(0, 10);
  }, [d, all]);

  if (isLoading) {
    return (
      <div className="tsite">
        <SiteHeader tone="dark" />
        <div className="dhero skeleton-hero" aria-busy="true" />
      </div>
    );
  }
  if (!d) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="tsite">
        <SiteHeader />
        <main className="twrap tempty tall">
          <p className="script">Off the map</p>
          <h1 className="serif">{notFound ? "We couldn't find that destination." : 'Something went wrong loading this page.'}</h1>
          <Link to="/explore" className="btn dark">Explore destinations</Link>
        </main>
      </div>
    );
  }

  const cover = d.cover ? assetUrl(d.cover.url) : undefined;
  const credits = [
    d.cover?.credit && `Photo: ${d.cover.credit}`,
    d.video?.credit && `Clip: ${d.video.credit}`,
    d.audio?.credit && `Sound: ${d.audio.credit}`,
    ...d.gallery.map((g, i) => g.credit && `Gallery ${i + 1}: ${g.credit}`),
  ].filter(Boolean) as string[];
  const hasSound = !!(d.audio || d.video);

  return (
    <div className="tsite">
      <SiteHeader tone="dark" />
      <main id="main">
        <section className="dhero" aria-labelledby="dest-title">
          {cover && <img className="dhero-img" src={cover} alt={d.cover?.alt || ''} />}
          {d.video && !reduce && (
            <video ref={video} className="dhero-video" src={assetUrl(d.video.url)} poster={cover} autoPlay muted loop playsInline aria-hidden="true" />
          )}
          <div className="dhero-shade" />
          <div className="dhero-inner">
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link to="/explore">Explore</Link> <span aria-hidden="true">/</span> <span aria-current="page">{d.name}</span>
            </nav>
            {d.tagline && <p className="dhero-tag">{d.tagline}</p>}
            <h1 id="dest-title" className={`dhero-title ts-${d.titleStyle}`}>{d.name}</h1>
            {d.summary && <p className="dhero-sum">{d.summary}</p>}
            <div className="dhero-actions">
              <Link to={`/plan?destination=${d.slug}`} className="btn gold">
                Plan my {d.name} trip <ArrowRightIcon size={18} />
              </Link>
              {hasSound && (
                <button
                  type="button"
                  className={`hear-btn ${listening && soundOn ? 'on' : ''}`}
                  aria-pressed={listening && soundOn}
                  onClick={() => {
                    if (listening && soundOn) preview.release(heroId);
                    else {
                      if (!soundOn) preview.setSound(true);
                      preview.request(heroId);
                    }
                  }}
                >
                  {listening && soundOn ? <SoundOnIcon size={18} /> : <SoundOffIcon size={18} />}
                  {listening && soundOn ? `Listening to ${d.name}` : `Hear ${d.name}`}
                </button>
              )}
              <SaveButton id={d.id} name={d.name} className="on-dark" />
            </div>
          </div>
        </section>

        <section className="twrap facts" aria-label="Quick facts">
          {d.bestTime && (
            <div className="fact">
              <SunIcon size={22} />
              <span className="caps">Best time</span>
              <strong>{d.bestTime}</strong>
            </div>
          )}
          <div className="fact">
            <MoonIcon size={22} />
            <span className="caps">Ideal trip</span>
            <strong>{d.minNights === d.maxNights ? `${d.minNights} nights` : `${d.minNights}–${d.maxNights} nights`}</strong>
          </div>
          {d.visa && (
            <div className="fact">
              <PassportIcon size={22} />
              <span className="caps">Visa</span>
              <strong>{d.visa}</strong>
            </div>
          )}
          {d.startingPrice > 0 && (
            <div className="fact">
              <CalendarIcon size={22} />
              <span className="caps">Starting from</span>
              <strong>{formatINR(d.startingPrice)} <small>per person</small></strong>
            </div>
          )}
        </section>

        <section className="twrap dabout">
          <div className="dabout-text">
            <p className="caps">About {d.name}</p>
            {d.description.split(/\n{2,}/).map((para, i) => (
              <p key={i} className={i === 0 ? 'lede' : ''}>{para}</p>
            ))}
          </div>
          <div className="dabout-side">
            {d.highlights.length > 0 && (
              <div className="tcard">
                <h2 className="tcard-title">Don't miss</h2>
                <ul className="ticks">
                  {d.highlights.map((h) => <li key={h}>{h}</li>)}
                </ul>
              </div>
            )}
            {d.cities.length > 0 && (
              <div className="tcard">
                <h2 className="tcard-title">A classic route</h2>
                <ol className="route">
                  {d.cities.map((c) => (
                    <li key={c.name}>
                      <strong>{c.name}</strong>
                      <span>{c.nights}N{c.note ? ` · ${c.note}` : ''}</span>
                    </li>
                  ))}
                </ol>
                <Link to={`/plan?destination=${d.slug}`} className="textlink">Customise this route →</Link>
              </div>
            )}
          </div>
        </section>

        {d.gallery.length > 0 && (
          <section className="twrap section-tight" aria-label={`${d.name} photos`}>
            <div className={`gallery g${Math.min(d.gallery.length, 4)}`}>
              {d.gallery.map((g, i) => (
                <img key={i} src={assetUrl(g.url)} alt={g.alt || `${d.name}, photo ${i + 1}`} loading="lazy" />
              ))}
            </div>
          </section>
        )}

        <section className="twrap section" id="packages">
          <PackagesSection destinations={all?.items ?? []} initialDestination={d.slug} lockDestination title={`${d.name} packages`} kicker="Ready-made, fully customisable" />
        </section>

        {similar.length > 0 && (
          <section className="twrap section-tight">
            <Rail label="You might also love" title="You might also love">
              {similar.map((x) => <DestinationCard key={x.id} d={x} showPrice />)}
            </Rail>
          </section>
        )}

        {credits.length > 0 && (
          <section className="twrap credits" aria-label="Media credits">
            <p>{credits.join(' · ')}</p>
          </section>
        )}
      </main>
      <Footer contact={content.contact} logo={content.images.logo} base="/" />
    </div>
  );
}
