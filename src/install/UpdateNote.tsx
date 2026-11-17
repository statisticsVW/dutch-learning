import { useEffect, useState } from 'preact/hooks';
import type { AppUpdates } from '../adapters/app-updates';

/**
 * A small note at the top once a new version has arrived. It never reloads by itself: progress is
 * saved after every answer, so updating loses nothing, but the Learner decides when.
 */
export function UpdateNote({ updates, reload }: { updates: AppUpdates; reload: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => updates.onReady(() => setReady(true)), [updates]);

  if (!ready) return null;
  return (
    <div class="update-note" role="status">
      <button type="button" onClick={reload}>
        New version: tap to update
      </button>
    </div>
  );
}
