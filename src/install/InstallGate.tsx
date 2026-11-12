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
      <InstallReminder />
      {children}
    </>
  );
}

function InstallScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <main class="install-screen">
      <h1>Add Dutch to your Home Screen</h1>
      <p>Dutch works best as an app on your Home Screen, so your progress doesn't vanish.</p>
      <p>Safari clears a website's saved data if you don't visit it for about a week. Apps on your Home Screen keep it.</p>
      <ol class="install-steps">
        <li>
          Tap the <strong>Share</strong> button (the square with an arrow) in Safari.
        </li>
        <li>
          Scroll down and tap <strong>Add to Home Screen</strong>.
        </li>
        <li>Open Dutch from your Home Screen.</li>
      </ol>
      <button type="button" class="install-continue" onClick={onContinue}>
        Continue in Safari for now
      </button>
    </main>
  );
}

function InstallReminder() {
  return (
    <aside class="install-reminder" role="note" aria-label="Install reminder">
      Add Dutch to your Home Screen (Share, then Add to Home Screen) so your progress doesn't vanish.
    </aside>
  );
}
