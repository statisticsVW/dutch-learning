import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { InstallStatus } from './installStatus';

/**
 * Wraps the app: in a browser tab, shows the one-time "add to Home Screen" screen on the first visit,
 * then a small reminder above the app. When running installed, renders the app untouched.
 */
export function InstallGate({ installStatus, children }: { installStatus: InstallStatus; children: ComponentChildren }) {
  const [installed] = useState(() => installStatus.isInstalled());
  const [showInstallScreen, setShowInstallScreen] = useState(() => !installed && !installStatus.hasSeenInstallScreen());

  if (installed) return <>{children}</>;

  if (showInstallScreen) {
    return (
      <InstallScreen
        onContinue={() => {
          installStatus.markInstallScreenSeen();
          setShowInstallScreen(false);
        }}
      />
    );
  }

  return (
    <>
      <InstallReminder onShowMe={() => setShowInstallScreen(true)} />
      {children}
    </>
  );
}

function InstallScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <main class="install-screen">
      <h1>Add Dutch to your Home Screen</h1>
      <p>Then it opens like a normal app, works without internet, and your progress doesn't vanish.</p>
      <ol class="install-steps">
        <li>
          <ShareIcon />
          <span>
            Tap the <strong>Share</strong> button in Safari’s toolbar, at the bottom of the screen.
            <span class="install-hint">
              Can’t see it? Tap <MoreIcon /> <strong>⋯</strong> first, then <strong>Share</strong>.
            </span>
          </span>
        </li>
        <li>
          <AddIcon />
          <span>
            Scroll down the list and tap <strong>Add to Home Screen</strong>.
          </span>
        </li>
        <li>
          <span class="install-step-word" aria-hidden="true">
            Add
          </span>
          <span>
            Tap <strong>Add</strong> in the top corner. (If you see <strong>Open as Web App</strong>, leave it on.)
          </span>
        </li>
        <li>
          <img class="install-app-icon" src="./icons/icon-192.png" alt="" width="40" height="40" />
          <span>
            Close Safari and tap the new <strong>Dutch</strong> icon on your Home Screen. It’s usually on the last page.
          </span>
        </li>
      </ol>
      <p class="install-hint">In Chrome or another app? Open this page in Safari first.</p>
      <p class="install-hint">Safari clears a website’s saved data if you don’t visit for about a week. Apps on your Home Screen keep it.</p>
      <button type="button" class="install-continue" onClick={onContinue}>
        Continue in Safari for now
      </button>
    </main>
  );
}

function InstallReminder({ onShowMe }: { onShowMe: () => void }) {
  return (
    <aside class="install-reminder" role="note" aria-label="Install reminder">
      <span>Add this app to your Home Screen so your progress doesn’t vanish.</span>
      <button type="button" class="install-show-me" onClick={onShowMe}>
        Show me how
      </button>
    </aside>
  );
}

// Drawings of Safari's own buttons, so the Learner knows what to look for.
const iconProps = { class: 'install-icon', width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'aria-hidden': true } as const;

function ShareIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3v12M8 7l4-4 4 4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" stroke-linecap="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg {...iconProps} class="install-icon install-icon-inline">
      <circle cx="12" cy="12" r="9" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" stroke-linecap="round" />
    </svg>
  );
}
