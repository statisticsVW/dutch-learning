/**
 * The colour themes the Learner can pick from. Each theme's palette lives in `style.css` under
 * `[data-theme='<id>']`, so a swatch can preview a theme just by carrying that attribute.
 */
export const THEMES = [
  { id: 'oranje', label: 'Oranje', english: 'orange' },
  { id: 'blauw', label: 'Blauw', english: 'blue' },
  { id: 'groen', label: 'Groen', english: 'green' },
  { id: 'paars', label: 'Paars', english: 'purple' },
  { id: 'nacht', label: 'Nacht', english: 'night' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'oranje';

export const isThemeId = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value);
