import { createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';
import type { Share, ShareResult } from './adapters/share';

/** The share adapter, for every Word request and Mistake report button. Without one, those buttons are hidden. */
export const ShareContext = createContext<Share | undefined>(undefined);

type Props = {
  /** The button's text. */
  label: string;
  /** What the message is, for the thank-you. */
  kind: 'Word request' | 'Mistake report';
  /** The message, already written. */
  message: string;
};

/**
 * Opens the share sheet with the message already written; the Learner picks who it goes to.
 * When the device can't share, the message is copied for pasting, or shown for copying by hand.
 */
export function ShareButton({ label, kind, message }: Props) {
  const share = useContext(ShareContext);
  const [result, setResult] = useState<ShareResult | undefined>();
  if (!share) return null;

  // Called straight from the tap: browsers only open the share sheet in response to one.
  const send = () => share.send(message).then(setResult);

  if (result === 'shared') return <p class="share-status muted" role="status">Thanks! Your {kind} is on its way.</p>;
  if (result === 'copied') {
    return (
      <p class="share-status" role="status">
        Copied! Paste it into a message to whoever looks after this app.
      </p>
    );
  }
  if (result === 'unavailable') {
    return (
      <label class="share-status share-manual">
        Copy this message and send it to whoever looks after this app:
        <textarea readonly rows={4} value={message} onFocus={(e) => e.currentTarget.select()} />
      </label>
    );
  }
  return (
    <button class="quiet share-button" onClick={send}>
      {label}
    </button>
  );
}
