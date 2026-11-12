import { render } from 'preact';
import packs from 'virtual:packs';
import { App } from './App';
import { systemClock } from './adapters/clock';
import { createLocalProgressStore } from './adapters/progress-store';
import { InstallGate } from './install/InstallGate';
import { browserInstallStatus } from './install/installStatus';
import './style.css';

render(
  <InstallGate installStatus={browserInstallStatus()}>
    <App packs={packs} store={createLocalProgressStore(localStorage)} clock={systemClock} />
  </InstallGate>,
  document.getElementById('app')!,
);

// The service worker (emitted by pwa/service-worker.ts) makes the app work offline after a first visit.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Offline support is a bonus; the app still works online without it.
  });
}
