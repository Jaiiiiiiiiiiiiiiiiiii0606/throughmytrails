import type { DestinationCard as Dest } from '../../api/types';
import { DestinationCard } from './DestinationCard';
import { Rail } from './Rail';
import { SoundToggle } from './SoundToggle';

/** "Where do you want to go?": tall arched cards that play a clip and the place's sound on hover. */
export function FeaturedDestinations({ items, title = 'Where do you want to go?', kicker }: { items: Dest[]; title?: string; kicker?: string }) {
  if (!items.length) return null;
  return (
    <div className="featured">
      <Rail label="Featured destinations" kicker={kicker} title={title} actions={<SoundToggle />} className="rail-arches">
        {items.map((d) => (
          <DestinationCard key={d.id} d={d} variant="arch" />
        ))}
      </Rail>
      <p className="featured-hint">Hover over a place to see it and hear it. On a phone, tap ▶.</p>
    </div>
  );
}
