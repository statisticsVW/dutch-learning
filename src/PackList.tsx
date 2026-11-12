import type { Pack } from './content/types';

export function PackList({ packs }: { packs: Pack[] }) {
  return (
    <ul class="pack-list" aria-label="Packs">
      {packs.map((pack) => (
        <li key={pack.id} class="pack">
          <span class="pack-title">{pack.title}</span>
          <span class="pack-count">
            {pack.cards.length} {pack.cards.length === 1 ? 'Card' : 'Cards'}
          </span>
        </li>
      ))}
    </ul>
  );
}
