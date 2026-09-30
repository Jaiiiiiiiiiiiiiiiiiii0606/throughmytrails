import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { assetUrl } from '../../api/client';
import { useDestinations } from '../../api/public';
import { useTraveller } from '../../auth/TravellerAuth';
import { SignInPanel } from '../../components/traveller/SignInPanel';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import '../../theme/traveller.css';

/** Only same-site paths are allowed as a post-sign-in destination. */
function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/login') ? raw : null;
}

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { status } = useTraveller();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data } = useDestinations();
  const next = safeNext(params.get('next'));
  const covers = (data?.items ?? []).filter((d) => d.cover).slice(0, 5);

  if (status === 'authed' && !params.has('stay')) return <Navigate to={next ?? '/explore'} replace />;

  return (
    <div className="login-page">
      <div className="login-art" aria-hidden="true">
        {covers.map((d, i) => (
          <figure key={d.id} className={`la la${i}`}>
            <img src={assetUrl(d.cover!.url)} alt="" />
            <figcaption className={`ts-${d.titleStyle}`}>{d.name}</figcaption>
          </figure>
        ))}
        <p className="login-quote script">Explore · Experience · Everywhere</p>
      </div>
      <main className="login-side">
        <Link to="/" className="shdr-brand login-brand">
          <img src="/assets/emblem.png" alt="" width={40} height={36} />
          <span className="script">Through My Trails</span>
        </Link>
        <SignInPanel onDone={(_u, isNew) => navigate(next ?? (isNew ? '/explore?welcome=1' : '/explore'), { replace: true })} />
        <Link to="/explore" className="textlink login-skip">Just browsing? Explore without signing in →</Link>
      </main>
    </div>
  );
}
