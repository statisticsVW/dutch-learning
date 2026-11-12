import type { CardNotes, Fact } from './content/types';
import { mistakeReport } from './adapters/share';
import { ShareButton } from './ShareButton';

/** Shown with the prompt: the Cognate moment, or a heads-up that a False friend is coming. */
export function PromptNote({ notes }: { notes?: CardNotes }) {
  if (notes?.cognate) {
    return <p class="note cognate">You already know this one! It looks and means the same as in English.</p>;
  }
  if (notes?.falseFriend) {
    return (
      <p class="note false-friend">
        <strong>False friend!</strong> It doesn’t mean what it looks like.
      </p>
    );
  }
  return null;
}

/** Shown with the feedback: what a False friend really means, the Card's Fact, and a Mistake report about the Card. */
export function AnswerNotes({ cardId, dutch, meaning, notes }: { cardId: string; dutch: string; meaning: string; notes?: CardNotes }) {
  return (
    <>
      {notes?.falseFriend && (
        <p class="note false-friend">
          “{dutch}” looks like “{notes.falseFriend.looksLike}”, but it means “{meaning}”.
        </p>
      )}
      {notes?.fact && <FactNote fact={notes.fact} />}
      <ShareButton
        label="Report a mistake in this Card"
        kind="Mistake report"
        message={mistakeReport({ kind: 'card', id: cardId }, `“${dutch}” means “${meaning}”`)}
      />
    </>
  );
}

/** A short "did you know" note. It names the Card or Pack it belongs to, for a Mistake report about it. */
export function FactNote({ fact }: { fact: Fact }) {
  return (
    <aside class="fact" data-fact-kind={fact.about.kind} data-fact-id={fact.about.id}>
      <h3>Did you know?</h3>
      <p>{fact.text}</p>
      <ShareButton label="Report a mistake in this Fact" kind="Mistake report" message={mistakeReport({ kind: 'fact', about: fact.about }, fact.text)} />
    </aside>
  );
}
