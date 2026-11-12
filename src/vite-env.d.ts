/// <reference types="vite/client" />

declare module 'virtual:packs' {
  import type { Pack } from './content/types';
  const packs: Pack[];
  export default packs;
}

declare module 'virtual:dictionary' {
  import type { DictionaryEntry } from './content/types';
  const entries: DictionaryEntry[];
  export default entries;
}
