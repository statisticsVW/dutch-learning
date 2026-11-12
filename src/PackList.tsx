import type { PackSummary } from './engine/engine';
import { ProgressRing } from './ProgressRing';

export function PackList({ packs, onPick }: { packs: PackSummary[]; onPick: (packId: string) => void }) {
  return (
    <ul class="pack-list" aria-label="Packs">
      {packs.map((pack) => (
        <li key={pack.id}>
          <button class="pack" onClick={() => onPick(pack.id)}>
            <span class="pack-title">{pack.title}</span>
            <ProgressRing learned={pack.learned} total={pack.total} />
          </button>
        </li>
      ))}
    </ul>
  );
}
