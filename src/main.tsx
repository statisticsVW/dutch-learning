import { render } from 'preact';
import { App } from './App';
import { InstallGate } from './install/InstallGate';
import { browserInstallStatus } from './install/installStatus';
import './style.css';

render(
  <InstallGate installStatus={browserInstallStatus()}>
    <App />
  </InstallGate>,
  document.getElementById('app')!,
);

// The service worker (emitted by pwa/service-worker.ts) makes the app work offline after a first visit.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Offline support is a bonus; the app still works online without it.
  });
}
