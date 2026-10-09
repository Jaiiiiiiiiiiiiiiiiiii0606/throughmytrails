import { assetUrl } from '../../api/client';
import type { PublicTeamMember } from '../../api/types';
import { initials } from '../../lib/format';

function Portrait({ m, sizes }: { m: PublicTeamMember; sizes: string }) {
  return m.image ? (
    <img src={assetUrl(m.image.url)} alt={m.image.alt || m.name} loading="lazy" sizes={sizes} width={m.image.width} height={m.image.height} />
  ) : (
    <span className="initials" aria-hidden="true">{initials(m.name)}</span>
  );
}

/** "Meet the team": the first member is featured (the founder), everyone else gets a small card. */
export function Team({ team }: { team: PublicTeamMember[] }) {
  if (!team.length) return null;
  const [lead, ...rest] = team;

  return (
    <section id="team" className="team" aria-labelledby="team-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="caps rv" style={{ margin: '0 0 14px' }}>Meet the team</p>
            <h2 id="team-title" className="h2 rv d1">
              The people behind <em>your trails.</em>
            </h2>
          </div>
          <p className="lead rv d2 team-intro">
            Real planners, not a booking engine. Every itinerary is researched, priced and checked by the people below.
          </p>
        </div>

        <div className="team-grid">
          <div className="rv">
            <article className="lead-card" data-tilt="4">
              <div className="portrait">
                <Portrait m={lead} sizes="(max-width: 900px) 100vw, 320px" />
              </div>
              <div className="lead-body">
                <span className="role-chip">{lead.role}</span>
                <h3>{lead.name}</h3>
                {lead.bio && <p>{lead.bio}</p>}
                <svg className="lead-trail" viewBox="0 0 240 40" aria-hidden="true">
                  <path d="M2 30 C 40 30, 50 8, 90 12 S 150 34, 190 22 S 230 8, 238 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 7" strokeLinecap="round" />
                </svg>
              </div>
            </article>
          </div>

          {rest.length > 0 && (
            <>
            <p className="caps rv team-sub">Core team</p>
            <div className="team-cards">
              {rest.map((m, i) => (
                <div key={m.key} className={`rv d${(i % 4) + 1}`}>
                  <article className="member" data-tilt="8">
                    <div className="portrait">
                      <Portrait m={m} sizes="(max-width: 640px) 50vw, 220px" />
                    </div>
                    <div className="member-body">
                      <h3>{m.name}</h3>
                      <span className="role">{m.role}</span>
                      {m.bio && <p>{m.bio}</p>}
                    </div>
                  </article>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
