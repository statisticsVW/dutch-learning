import packs from 'virtual:packs';
import { PackList } from './PackList';

export function App() {
  return (
    <main>
      <h1>Dutch</h1>
      <h2>Packs</h2>
      <PackList packs={packs} />
    </main>
  );
}
