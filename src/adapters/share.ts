// Sending the Curator a Word request or a Mistake report through the device's share sheet.
// The Learner picks who to send it to, so no contact details are ever in the site (CLAUDE.md).
import type { FactPlace } from '../content/types';

/**
 * What happened to a message:
 * - shared: the share sheet opened and the Learner sent it somewhere;
 * - cancelled: the share sheet opened and the Learner closed it;
 * - copied: this device can't share, so the message was copied for pasting into a message;
 * - unavailable: it could neither share nor copy, so the Learner has to copy it by hand.
 */
export type ShareResult = 'shared' | 'cancelled' | 'copied' | 'unavailable';

export type Share = {
  /** Call from a tap: browsers only open the share sheet, or copy, in response to one. */
  send(message: string): Promise<ShareResult>;
};

/** The parts of the browser's `navigator` this adapter uses. */
export type NavigatorShareLike = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: Pick<Clipboard, 'writeText'>;
};

export function createBrowserShare(nav: NavigatorShareLike): Share {
  const copy = async (message: string): Promise<ShareResult> => {
    try {
      if (!nav.clipboard) return 'unavailable';
      await nav.clipboard.writeText(message);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  };

  return {
    async send(message) {
      const data: ShareData = { text: message };
      if (!nav.share || nav.canShare?.(data) === false) return copy(message);
      try {
        await nav.share(data);
        return 'shared';
      } catch (error) {
        // Closing the share sheet is a choice, not a failure: don't copy behind the Learner's back.
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
        return copy(message);
      }
    },
  };
}

/** A Word request: asks the Curator to add a word the Dictionary doesn't have. */
export function wordRequest(word: string): string {
  return `Word request: please add “${word}” to the Dictionary of my Dutch app.`;
}

/** What a Mistake report is about: a Card, by its id, or a Fact, by the Card or Pack it belongs to. */
export type MistakeSubject = { kind: 'card'; id: string } | { kind: 'fact'; about: FactPlace };

/** A Mistake report: names the Card or Fact by its stable id, then quotes the text that looks wrong. */
export function mistakeReport(subject: MistakeSubject, text: string): string {
  return `Mistake report: ${describe(subject)} in my Dutch app looks wrong.\n\n${text}`;
}

function describe(subject: MistakeSubject): string {
  if (subject.kind === 'card') return `Card ${subject.id}`;
  return `the Fact on ${subject.about.kind === 'card' ? 'Card' : 'Pack'} ${subject.about.id}`;
}

/** In-memory fake for tests. `sent` records every message, oldest first. */
export type FakeShare = Share & { sent: string[] };

export function createFakeShare(result: ShareResult = 'shared'): FakeShare {
  const fake: FakeShare = {
    sent: [],
    send(message) {
      fake.sent.push(message);
      return Promise.resolve(result);
    },
  };
  return fake;
}
