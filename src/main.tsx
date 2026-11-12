import { render } from 'preact';
import packs from 'virtual:packs';
import { App } from './App';
import { systemClock } from './adapters/clock';
import { createLocalProgressStore } from './adapters/progress-store';
import { createLocalMyWordsStore } from './adapters/my-words-store';
import { createBrowserSpeech } from './adapters/speech';
import { createBrowserShare } from './adapters/share';
import { InstallGate } from './install/InstallGate';
import { browserInstallStatus } from './install/installStatus';
import { createLocalPersonalisationStore } from './adapters/personalisation-store';
import { PersonaliseGate } from './personalise/PersonaliseGate';
import { createBrowserBackupFiles } from './backup/files';
import './style.css';

const progress = createLocalProgressStore(localStorage);
const myWords = createLocalMyWordsStore(localStorage);
const speech = createBrowserSpeech('speechSynthesis' in window ? window.speechSynthesis : undefined);
// The Dictionary is its own file in the build, fetched only when the Learner opens the Dictionary screen.
const dictionary = { load: () => import('virtual:dictionary').then((m) => m.default), myWords };
const share = createBrowserShare(navigator);
const backup = { progress, myWords, files: createBrowserBackupFiles(), clock: systemClock };

render(
  <InstallGate installStatus={browserInstallStatus()}>
    <PersonaliseGate store={createLocalPersonalisationStore(localStorage)} backup={backup}>
      <App packs={packs} store={progress} clock={systemClock} dictionary={dictionary} speech={speech} share={share} />
    </PersonaliseGate>
  </InstallGate>,
  document.getElementById('app')!,
);

// The service worker (emitted by pwa/service-worker.ts) makes the app work offline after a first visit.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Offline support is a bonus; the app still works online without it.
  });
}
