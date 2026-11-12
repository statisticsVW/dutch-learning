import { render } from 'preact';
import packs from 'virtual:packs';
import { App } from './App';
import { systemClock } from './adapters/clock';
import { createLocalProgressStore } from './adapters/progress-store';
import { createLocalMyWordsStore } from './adapters/my-words-store';
import { createBrowserSpeech } from './adapters/speech';
import { InstallGate } from './install/InstallGate';
import { browserInstallStatus } from './install/installStatus';
import { createLocalPersonalisationStore } from './adapters/personalisation-store';
import { PersonaliseGate } from './personalise/PersonaliseGate';
import './style.css';

const speech = createBrowserSpeech('speechSynthesis' in window ? window.speechSynthesis : undefined);
// The Dictionary is its own file in the build, fetched only when the Learner opens the Dictionary screen.
const dictionary = { load: () => import('virtual:dictionary').then((m) => m.default), myWords: createLocalMyWordsStore(localStorage) };

render(
  <InstallGate installStatus={browserInstallStatus()}>
    <PersonaliseGate store={createLocalPersonalisationStore(localStorage)}>
      <App packs={packs} store={createLocalProgressStore(localStorage)} clock={systemClock} dictionary={dictionary} speech={speech} />
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
