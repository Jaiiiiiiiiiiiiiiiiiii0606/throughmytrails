import { Link, useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStats } from '../../api/admin';
import type { Stats } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { STATUS_COLORS, StatusBadge } from '../../components/admin/StatusBadge';
import { PLANE_PATH } from '../../components/illustrations/Icons';
import { BUDGET_LABELS, Budget } from '../../lib/constants';
import { firstName, relativeTime } from '../../lib/format';

const INK = '#2E2219';
const BROWN = '#5A4330';
const MUTED = '#6B4E35';
const GRID = '#E3D6C1';
const axisTick = { fill: MUTED, fontSize: 12, fontFamily: 'Jost, sans-serif' };

function Tip({ active, payload, label, fmt }: { active?: boolean; payload?: { value: number }[]; label?: string; fmt?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="chart-tip">
      <div>{fmt ? fmt(String(label)) : label}</div>
      <strong>{v}</strong> {v === 1 ? 'enquiry' : 'enquiries'}
    </div>
  );
}

const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const dayLong = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });

function Tiles({ t }: { t: Stats['totals'] }) {
  const delta = t.thisWeek - t.lastWeek;
  const tiles = [
    { label: 'Total enquiries', value: t.total.toLocaleString('en-IN'), meta: 'All time' },
    { label: 'New', value: t.new, meta: t.new ? 'Waiting for a first reply' : 'Inbox zero ✦' },
    {
      label: 'This week',
      value: t.thisWeek,
      meta: delta === 0 ? 'Same as the week before' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} vs the week before`,
    },
    { label: 'Conversion', value: `${Math.round(t.conversionRate * 100)}%`, meta: `${t.booked} booked of ${t.total}` },
  ];
  return (
    <div className="tiles">
      {tiles.map((x) => (
        <section className="card tile" key={x.label} aria-label={x.label}>
          <span className="caps">{x.label}</span>
          <span className="value">{x.value}</span>
          <span className="meta">{x.meta}</span>
          <svg className="deco" viewBox="-16 -16 32 32" aria-hidden="true">
            <path d={PLANE_PATH} fill="currentColor" transform="rotate(-30)" />
          </svg>
        </section>
      ))}
    </div>
  );
}

function PerDay({ data }: { data: Stats['perDay'] }) {
  const total = data.reduce((a, d) => a + d.count, 0);
  return (
    <section className="card span-8" aria-labelledby="c-perday">
      <h2 id="c-perday">Enquiries per day</h2>
      <p className="card-sub">Last 30 days · {total} in total</p>
      <div className="chart-h">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="perDayFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A67C4E" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#A67C4E" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="date" tickFormatter={dayLabel} tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={28} />
            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<Tip fmt={dayLong} />} cursor={{ stroke: MUTED, strokeDasharray: '3 3' }} />
            <Area type="linear" dataKey="count" stroke={BROWN} strokeWidth={2} fill="url(#perDayFill)" activeDot={{ r: 5, fill: BROWN, stroke: '#FBF7F0', strokeWidth: 2 }} isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ByStatus({ data }: { data: Stats['byStatus'] }) {
  const total = data.reduce((a, d) => a + d.count, 0);
  const nav = useNavigate();
  return (
    <section className="card span-4" aria-labelledby="c-status">
      <h2 id="c-status">By status</h2>
      <p className="card-sub">Where every enquiry sits in the pipeline</p>
      <div style={{ height: 190, position: 'relative' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data.filter((d) => d.count)} dataKey="count" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={1.5} stroke="#FBF7F0" strokeWidth={2}>
              {data.filter((d) => d.count).map((d) => (
                <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="chart-tip">
                    <div>{String(payload[0].name)}</div>
                    <strong>{String(payload[0].value)}</strong> · {total ? Math.round((Number(payload[0].value) / total) * 100) : 0}%
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>
          <div>
            <div className="serif" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1 }}>{total}</div>
            <div className="caps" style={{ fontSize: 10 }}>total</div>
          </div>
        </div>
      </div>
      <ul className="legend" style={{ marginTop: 16 }}>
        {data.map((d) => (
          <li key={d.status}>
            <span className="sw" style={{ background: STATUS_COLORS[d.status] }} aria-hidden="true" />
            <button type="button" className="linkish" style={{ padding: 0, minHeight: 28, color: 'var(--text-2)' }} onClick={() => nav(`/admin/enquiries?status=${d.status}`)}>
              {d.label}
            </button>
            <span className="n">{d.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ByTripType({ data }: { data: Stats['byTripType'] }) {
  return (
    <section className="card span-6" aria-labelledby="c-trip">
      <h2 id="c-trip">By trip type</h2>
      <p className="card-sub">What travellers are asking for</p>
      {data.length ? (
        <div style={{ height: Math.max(180, data.length * 44) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }} barCategoryGap={10}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 6" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={{ ...axisTick, fill: INK, fontSize: 13 }} tickLine={false} axisLine={false} width={140} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(166,124,78,0.10)' }} />
              <Bar dataKey="count" fill={BROWN} radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: 'right', fill: INK, fontSize: 13, fontWeight: 600 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="help">No enquiries yet.</p>
      )}
    </section>
  );
}

function TopDestinations({ data }: { data: Stats['topDestinations'] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <section className="card span-6" aria-labelledby="c-dest">
      <h2 id="c-dest">Top destinations</h2>
      <p className="card-sub">Most requested places</p>
      {data.length ? (
        <ol className="rank">
          {data.map((d, i) => (
            <li key={d.destination}>
              <span className="pos">{i + 1}</span>
              <span className="name">
                <Link to={`/admin/enquiries?q=${encodeURIComponent(d.destination)}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {d.destination}
                </Link>
              </span>
              <span className="n">{d.count}</span>
              <span className="meter" aria-hidden="true">
                <span style={{ width: `${(d.count / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="help">No enquiries yet.</p>
      )}
    </section>
  );
}

function Recent({ data }: { data: Stats['recent'] }) {
  const nav = useNavigate();
  return (
    <section className="card span-12" aria-labelledby="c-recent">
      <div className="card-head">
        <div>
          <h2 id="c-recent">Recent enquiries</h2>
          <p className="card-sub">The latest five</p>
        </div>
        <Link to="/admin/enquiries" className="btn line sm">View all</Link>
      </div>
      {data.length ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Name</th>
                <th scope="col">Destination</th>
                <th scope="col">Budget</th>
                <th scope="col">Status</th>
                <th scope="col">Received</th>
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.id}>
                  <td className="ref">{e.referenceId}</td>
                  <td>
                    <button type="button" className="row-link" onClick={() => nav(`/admin/enquiries/${e.id}`)}>{e.name}</button>
                  </td>
                  <td>{e.destination}</td>
                  <td className="muted nowrap">{e.budget ? BUDGET_LABELS[e.budget as Budget] : '—'}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td className="muted nowrap">{relativeTime(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <span className="script">Quiet skies</span>
          New enquiries from the website will land here.
        </div>
      )}
    </section>
  );
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useStats();

  return (
    <>
      <div className="page-head">
        <div>
          <span className="caps">Dashboard</span>
          <h1>
            {greeting()}, <em>{firstName(user?.name ?? '')}.</em>
          </h1>
          <p className="sub">Here's how the trails are looking today.</p>
        </div>
      </div>

      {error ? (
        <div className="card empty" role="alert">
          <span className="script">Turbulence</span>
          We couldn't load the dashboard. <button type="button" className="linkish" onClick={() => refetch()}>Try again</button>
        </div>
      ) : isLoading || !data ? (
        <div aria-busy="true">
          <div className="tiles">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 150 }} />)}</div>
          <div className="dash-grid">
            <div className="skeleton span-8" style={{ height: 340 }} />
            <div className="skeleton span-4" style={{ height: 340 }} />
          </div>
        </div>
      ) : (
        <>
          <Tiles t={data.totals} />
          <div className="dash-grid">
            <PerDay data={data.perDay} />
            <ByStatus data={data.byStatus} />
            <ByTripType data={data.byTripType} />
            <TopDestinations data={data.topDestinations} />
            <Recent data={data.recent} />
          </div>
        </>
      )}
    </>
  );
}
