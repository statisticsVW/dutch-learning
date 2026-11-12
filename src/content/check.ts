// The content check: turns the Curator's Pack files into validated content,
// or into a plain-language list of what needs fixing. Runs at build time.
import { parse } from 'yaml';
import { PARTS_OF_SPEECH, type Card, type Pack, type PartOfSpeech } from './types.ts';

export type PackFile = { path: string; text: string };

export type CheckResult = { ok: true; packs: Pack[] } | { ok: false; errors: string[] };

type CheckedPack = { path: string; pack: Pack };

const POS_CHOICES = PARTS_OF_SPEECH.join(', ');

export function checkContent(files: PackFile[]): CheckResult {
  if (files.length === 0) return { ok: false, errors: ['No Pack files were found in content/packs.'] };

  const errors: string[] = [];
  const checked: CheckedPack[] = [];
  for (const file of files) {
    const pack = checkPackFile(file, errors);
    if (pack) checked.push({ path: file.path, pack });
  }
  checkUniquePackIds(checked, errors);
  checkUniqueCardIds(checked, errors);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, packs: checked.map((c) => c.pack) };
}

/** The Curator-facing report for a failed check, one problem per line. */
export function formatErrors(errors: string[]): string {
  return `The content check found ${errors.length} problem(s):\n\n${errors.map((e) => `- ${e}`).join('\n')}`;
}

function checkPackFile(file: PackFile, errors: string[]): Pack | undefined {
  let data: unknown;
  try {
    data = parse(file.text);
  } catch (e) {
    const detail = e instanceof Error ? e.message.split('\n')[0] : String(e);
    errors.push(`${file.path}: this file is not valid YAML (${detail}). Check indentation, colons and brackets.`);
    return undefined;
  }

  const before = errors.length;
  const fileError = (message: string) => errors.push(`${file.path}: ${message}`);
  if (!isRecord(data)) {
    fileError('the file should describe one Pack, starting with "title:" and "cards:".');
    return undefined;
  }

  const title = data.title;
  if (!isText(title)) fileError('the Pack needs a "title" (text).');

  const rawCards = data.cards;
  const cards: Card[] = [];
  if (!Array.isArray(rawCards) || rawCards.length === 0) {
    fileError('the Pack needs a "cards" list with at least one Card.');
  } else {
    rawCards.forEach((raw, index) => {
      const card = checkCard(raw, index, file.path, errors);
      if (card) cards.push(card);
    });
  }

  if (errors.length > before) return undefined;
  return { id: packIdFromPath(file.path), title: title as string, cards };
}

function checkCard(raw: unknown, index: number, path: string, errors: string[]): Card | undefined {
  const label = isRecord(raw) && isText(raw.id) ? `Card ${raw.id}` : `Card #${index + 1}`;
  const cardError = (message: string) => errors.push(`${path}, ${label}: ${message}`);
  if (!isRecord(raw)) {
    cardError('each Card should be a set of fields like "id:", "dutch:", "english:" and "pos:".');
    return undefined;
  }

  const before = errors.length;
  const { id, dutch, pos, article } = raw;
  if (!isText(id)) cardError(`"id" is missing (every Card needs a unique id, like ${packIdFromPath(path)}-${String(index + 1).padStart(2, '0')}).`);
  if (!isText(dutch)) cardError('"dutch" is missing (it should be the Dutch word or phrase).');

  const english = typeof raw.english === 'string' ? [raw.english] : raw.english;
  if (english === undefined) cardError('"english" is missing (give one meaning, or a list of meanings).');
  else if (!Array.isArray(english) || !english.every(isText)) cardError('"english" must be a meaning, or a list of meanings.');
  else if (english.length === 0) cardError('"english" needs at least one meaning.');

  if (!isText(pos)) cardError(`"pos" (part of speech) is missing; it must be one of: ${POS_CHOICES}.`);
  else if (!PARTS_OF_SPEECH.includes(pos as PartOfSpeech)) cardError(`"pos" is "${pos}", but it must be one of: ${POS_CHOICES}.`);

  if (article !== undefined && !isText(article)) cardError('"article" must be text.');

  if (errors.length > before) return undefined;
  const card: Card = { id: id as string, dutch: dutch as string, english: english as string[], pos: pos as PartOfSpeech };
  if (article !== undefined) card.article = article as string;
  return card;
}

function checkUniquePackIds(checked: CheckedPack[], errors: string[]) {
  const firstSeenIn = new Map<string, string>();
  for (const { path, pack } of checked) {
    const seen = firstSeenIn.get(pack.id);
    if (seen) errors.push(`${path}: another Pack file (${seen}) has the same name. Rename one of them.`);
    else firstSeenIn.set(pack.id, path);
  }
}

function checkUniqueCardIds(checked: CheckedPack[], errors: string[]) {
  const firstSeenIn = new Map<string, string>();
  for (const { path, pack } of checked) {
    for (const card of pack.cards) {
      const seen = firstSeenIn.get(card.id);
      if (seen) errors.push(`${path}: Card id "${card.id}" is used more than once (also in ${seen}). Every Card id must be unique.`);
      else firstSeenIn.set(card.id, path);
    }
  }
}

function packIdFromPath(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path;
  return name.replace(/\.ya?ml$/i, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
