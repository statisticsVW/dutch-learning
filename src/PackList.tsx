import type { PackSummary } from './engine/engine';
import { ProgressRing } from './ProgressRing';

export function PackList({ packs, onPick }: { packs: PackSummary[]; onPick: (packId: string) => void }) {
  return (
    <ul class="pack-list" aria-label="Packs">
      {packs.map((pack) => (
        <li key={pack.id}>
          <button class="pack" onClick={() => onPick(pack.id)}>
            <span class="pack-title">{pack.title}</span>
            <span class="pack-progress">
              {/* The ring already tells screen readers "2 of 5 learned"; the count is for the eye. */}
              <span class="pack-count" aria-hidden="true">
                {pack.learned}/{pack.total}
              </span>
              <ProgressRing learned={pack.learned} total={pack.total} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
