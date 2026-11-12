import { render } from 'preact';
import packs from 'virtual:packs';
import { App } from './App';
import { systemClock } from './adapters/clock';
import { createLocalProgressStore } from './adapters/progress-store';
import './style.css';

render(<App packs={packs} store={createLocalProgressStore(localStorage)} clock={systemClock} />, document.getElementById('app')!);
