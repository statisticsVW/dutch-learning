import { useState } from 'preact/hooks';
import type { AnswerResult, Engine } from './engine/engine';

type Props = { engine: Engine; onAnswered: (result: AnswerResult) => void; onMore: () => void; onDone: () => void };

/** One group of new Cards: recognise prompts, feedback after each answer, then "more" or back. */
export function Practice({ engine, onAnswered, onMore, onDone }: Props) {
  const [feedback, setFeedback] = useState<(AnswerResult & { dutch: string }) | undefined>();
  const next = engine.nextPrompt();

  if (feedback) {
    return (
      <section class="practice">
        <h2 class="prompt-dutch" lang="nl">
          {feedback.dutch}
        </h2>
        <p class={`feedback ${feedback.verdict}`} role="status">
          {feedback.verdict === 'correct' ? 'Goed zo!' : `Not quite: it means "${feedback.correctAnswer}".`}
        </p>
        <button class="primary" autofocus onClick={() => setFeedback(undefined)}>
          Next
        </button>
      </section>
    );
  }

  if (next.kind === 'group-done') {
    return (
      <section class="practice">
        <p class="feedback">{next.canDoMore ? 'Nice! Want five more?' : 'Nice work! That’s all the new Cards for now.'}</p>
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
      <h2 class="prompt-dutch" lang="nl">
        {next.dutch}
      </h2>
      <div class="options">
        {next.options.map((option) => (
          <button
            key={option}
            class="option"
            onClick={() => {
              const result = engine.answer(option);
              onAnswered(result);
              setFeedback({ ...result, dutch: next.dutch });
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
