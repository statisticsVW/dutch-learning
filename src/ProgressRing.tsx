const SIZE = 44;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A Pack's progress: Cards learned out of Cards in the Pack. */
export function ProgressRing({ learned, total }: { learned: number; total: number }) {
  const fraction = total === 0 ? 0 : learned / total;
  return (
    <svg class="ring" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${learned} of ${total} learned`}>
      <circle class="ring-track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke-width={STROKE} fill="none" />
      <circle
        class="ring-fill"
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke-width={STROKE}
        fill="none"
        stroke-linecap="round"
        stroke-dasharray={CIRCUMFERENCE}
        stroke-dashoffset={CIRCUMFERENCE * (1 - fraction)}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
    </svg>
  );
}
