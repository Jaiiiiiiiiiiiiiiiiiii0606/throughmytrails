import { MouseEvent } from 'react';
import { useToggleSaved } from '../../api/account';
import { useTraveller } from '../../auth/TravellerAuth';
import { HeartIcon } from './TIcons';

/** Heart toggle. Signed-out visitors are asked to sign in first, then the place is saved. */
export function SaveButton({ id, name, className = '' }: { id: string; name: string; className?: string }) {
  const { user, requireSignIn } = useTraveller();
  const toggle = useToggleSaved();
  const saved = !!user?.savedDestinations.includes(id);

  const onClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const u = await requireSignIn(`Sign in to save ${name}`);
      toggle.mutate({ id, saved: !u.savedDestinations.includes(id) });
    } catch {
      /* dismissed */
    }
  };

  return (
    <button
      type="button"
      className={`save-btn ${saved ? 'on' : ''} ${className}`}
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved places` : `Save ${name}`}
      title={saved ? 'Saved' : 'Save'}
    >
      <HeartIcon size={18} filled={saved} />
    </button>
  );
}
