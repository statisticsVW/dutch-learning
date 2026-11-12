import { describe, expect, it } from 'vitest';
import { createBrowserShare, mistakeReport, wordRequest, type NavigatorShareLike } from './share';

function fakeNavigator(options: { share?: 'ok' | 'cancel' | 'refuse'; clipboard?: 'ok' | 'refuse' | 'missing'; canShare?: boolean }) {
  const shared: ShareData[] = [];
  const copied: string[] = [];
  const nav: NavigatorShareLike = {};
  if (options.share) {
    nav.share = (data) => {
      shared.push(data);
      if (options.share === 'cancel') return Promise.reject(new DOMException('Share canceled', 'AbortError'));
      if (options.share === 'refuse') return Promise.reject(new DOMException('Not allowed', 'NotAllowedError'));
      return Promise.resolve();
    };
  }
  if (options.canShare !== undefined) nav.canShare = () => options.canShare!;
  if (options.clipboard !== 'missing') {
    nav.clipboard = {
      writeText: (text) => {
        if (options.clipboard === 'refuse') return Promise.reject(new Error('denied'));
        copied.push(text);
        return Promise.resolve();
      },
    };
  }
  return { nav, shared, copied };
}

describe('browser share', () => {
  it('opens the share sheet with the message', async () => {
    const { nav, shared, copied } = fakeNavigator({ share: 'ok' });
    expect(await createBrowserShare(nav).send('hello')).toBe('shared');
    expect(shared).toEqual([{ text: 'hello' }]);
    expect(copied).toEqual([]);
  });

  it('says so when the Learner closes the share sheet without sending', async () => {
    const { nav, copied } = fakeNavigator({ share: 'cancel' });
    expect(await createBrowserShare(nav).send('hello')).toBe('cancelled');
    expect(copied).toEqual([]);
  });

  it('copies the message when the browser cannot share', async () => {
    const { nav, copied } = fakeNavigator({});
    expect(await createBrowserShare(nav).send('hello')).toBe('copied');
    expect(copied).toEqual(['hello']);
  });

  it('copies the message when the browser cannot share text', async () => {
    const { nav, shared, copied } = fakeNavigator({ share: 'ok', canShare: false });
    expect(await createBrowserShare(nav).send('hello')).toBe('copied');
    expect(shared).toEqual([]);
    expect(copied).toEqual(['hello']);
  });

  it('copies the message when the browser refuses to share', async () => {
    const { nav, copied } = fakeNavigator({ share: 'refuse' });
    expect(await createBrowserShare(nav).send('hello')).toBe('copied');
    expect(copied).toEqual(['hello']);
  });

  it('leaves the message for copying by hand when it can neither share nor copy', async () => {
    expect(await createBrowserShare(fakeNavigator({ clipboard: 'missing' }).nav).send('hello')).toBe('unavailable');
    expect(await createBrowserShare(fakeNavigator({ clipboard: 'refuse' }).nav).send('hello')).toBe('unavailable');
  });
});

describe('messages', () => {
  it('names the word in a Word request', () => {
    expect(wordRequest('fiets')).toBe('Word request: please add “fiets” to the Dictionary of my Dutch app.');
  });

  it('names the Card id and its text in a Mistake report about a Card', () => {
    expect(mistakeReport({ kind: 'card', id: 'food-01' }, '“de appel” means “apple”')).toBe(
      'Mistake report: Card food-01 in my Dutch app looks wrong.\n\n“de appel” means “apple”',
    );
  });

  it('names the owner of a Fact and its text in a Mistake report about a Fact', () => {
    expect(mistakeReport({ kind: 'fact', about: { kind: 'card', id: 'food-01' } }, 'Appeltaart is a Dutch favourite.')).toBe(
      'Mistake report: the Fact on Card food-01 in my Dutch app looks wrong.\n\nAppeltaart is a Dutch favourite.',
    );
    expect(mistakeReport({ kind: 'fact', about: { kind: 'pack', id: 'food' } }, 'Hagelslag on bread.')).toBe(
      'Mistake report: the Fact on Pack food in my Dutch app looks wrong.\n\nHagelslag on bread.',
    );
  });
});
