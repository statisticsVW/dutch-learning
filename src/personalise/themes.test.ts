// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEMES } from './themes';

/**
 * Readability check on the real stylesheet: every block that sets a palette (the default ones and
 * each `[data-theme]` theme) must meet WCAG AA contrast for the pairs the app actually draws.
 */
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

type Palette = Record<string, string>;
const palettes: { selector: string; colours: Palette }[] = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({
    selector: selector.trim(),
    colours: Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, hex]) => [name, hex])),
  }))
  .filter((block) => 'bg' in block.colours);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum ratio]: 4.5 for text, 3 for shapes such as the progress ring.
const PAIRS: [string, string, number][] = [
  ['fg', 'bg', 4.5],
  ['fg', 'surface', 4.5],
  ['muted', 'bg', 4.5],
  ['muted', 'surface', 4.5],
  ['good', 'bg', 4.5],
  ['good', 'surface', 4.5],
  ['on-accent', 'accent', 4.5],
  ['accent', 'bg', 3],
  ['accent', 'surface', 3],
];

describe('colour themes', () => {
  it('each theme in the picker has a palette in the stylesheet, and vice versa', () => {
    const styled = palettes.flatMap((p) => [...p.selector.matchAll(/\[data-theme='([\w-]+)'\]/g)].map((m) => m[1]));
    expect(new Set(styled)).toEqual(new Set(THEMES.map((t) => t.id)));
  });

  it.each(palettes.map((p) => [p.selector, p.colours] as const))('%s is readable', (_selector, colours) => {
    for (const [fg, bg, min] of PAIRS) {
      expect(colours[fg], `--${fg} is set`).toBeDefined();
      expect(colours[bg], `--${bg} is set`).toBeDefined();
      expect(contrast(colours[fg], colours[bg]), `--${fg} on --${bg}`).toBeGreaterThanOrEqual(min);
    }
  });
});
