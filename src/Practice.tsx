import { useEffect, useRef, useState } from 'preact/hooks';
import type { AnswerResult, Engine, GroupDone, Prompt } from './engine/engine';
import type { Speak } from './adapters/speech';
import { AnswerNotes, FactNote, PromptNote } from './CardNotes';

/** What the Learner chose on the home screen. */
export type Activity = { kind: 'new'; packId: string } | { kind: 'review' };

type Props = {
  engine: Engine;
  activity: Activity;
  /** Speaks Dutch; undefined when the device has no Dutch voice. */
  speak?: Speak;
  onAnswered: (result: AnswerResult) => void;
  onMore: () => void;
  onDone: () => void;
};

/** One group of new Cards, or a review: recognise and listen prompts, feedback after each answer, then "more" or back. */
export function Practice({ engine, activity, speak, onAnswered, onMore, onDone }: Props) {
  const [feedback, setFeedback] = useState<(AnswerResult & Pick<Prompt, 'cardId' | 'dutch' | 'notes'>) | undefined>();
  const next = engine.nextPrompt();

  // A listen prompt plays as soon as it appears (once per prompt). Speaking from the tap that
  // brought it up, where possible, keeps iOS happy: it only lets taps start speech at first.
  const spokenFor = useRef<Prompt | undefined>(undefined);
  const playIfListening = (prompt: Prompt | GroupDone) => {
    if (prompt.kind !== 'prompt' || prompt.mode !== 'listen' || spokenFor.current === prompt) return;
    spokenFor.current = prompt;
    speak?.(prompt.dutch);
  };
  useEffect(() => {
    if (!feedback) playIfListening(next);
  });

  if (feedback) {
    return (
      <section class="practice">
        <DutchHeading dutch={feedback.dutch} speak={speak} />
        <p class={`feedback ${feedback.verdict}`} role="status">
          {feedback.verdict === 'correct' ? 'Goed zo!' : `Not quite: it means "${feedback.correctAnswer}".`}
        </p>
        <AnswerNotes cardId={feedback.cardId} dutch={feedback.dutch} meaning={feedback.correctAnswer} notes={feedback.notes} />
        <button
          class="primary"
          autofocus
          onClick={() => {
            setFeedback(undefined);
            playIfListening(engine.nextPrompt());
          }}
        >
          Next
        </button>
      </section>
    );
  }

  if (next.kind === 'group-done') {
    return (
      <section class="practice">
        <p class="feedback">{doneMessage(activity, next.canDoMore)}</p>
        {next.fact && <FactNote fact={next.fact} />}
        {next.canDoMore && (
          <button class="primary" onClick={onMore}>
            More
          </button>
        )}
        <button onClick={onDone}>Back to Packs</button>
      </section>
    );
  }

  return (
    <section class="practice">
      {next.mode === 'listen' ? (
        <>
          <h2 class="prompt-listen">Listen: what does it mean?</h2>
          <button class="play" onClick={() => speak?.(next.dutch)}>
            <span aria-hidden="true">🔊</span> Play again
          </button>
        </>
      ) : (
        <DutchHeading dutch={next.dutch} speak={speak} />
      )}
      <PromptNote notes={next.notes} />
      <div class="options">
        {next.options.map((option) => (
          <button
            key={option}
            class="option"
            onClick={() => {
              const result = engine.answer(option);
              onAnswered(result);
              setFeedback({ ...result, cardId: next.cardId, dutch: next.dutch, notes: next.notes });
            }}
          >
            {option}
          </button>
        ))}
      </div>
      <button class="quiet" onClick={onDone}>
        Stop
      </button>
    </section>
  );
}

/** The Dutch, written, with a button to hear it when the device can speak Dutch. */
function DutchHeading({ dutch, speak }: { dutch: string; speak?: Speak }) {
  return (
    <div class="dutch-line">
      <h2 class="prompt-dutch" lang="nl">
        {dutch}
      </h2>
      {speak && (
        <button class="hear" aria-label="Hear it in Dutch" onClick={() => speak(dutch)}>
          <span aria-hidden="true">🔊</span>
        </button>
      )}
    </div>
  );
}

function doneMessage(activity: Activity, canDoMore: boolean): string {
  if (activity.kind === 'review') return 'All reviewed. Nice work!';
  return canDoMore ? 'Nice! Want five more?' : 'Nice work! That’s all the new Cards for now.';
}
