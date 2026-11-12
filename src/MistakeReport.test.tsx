import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/preact';
import { App } from './App';
import type { Card, Pack } from './content/types';
import { createMemoryProgressStore } from './adapters/progress-store';
import { createFakeClock } from './adapters/clock';
import { createFakeShare, mistakeReport, type ShareResult } from './adapters/share';

const appel: Card = {
  id: 'food-01',
  dutch: 'appel',
  english: ['apple'],
  pos: 'noun',
  article: 'de',
  fact: { text: 'Appeltaart (apple pie) is a Dutch favourite.', about: { kind: 'card', id: 'food-01' } },
};
const brood: Card = { id: 'food-03', dutch: 'brood', english: ['bread'], pos: 'noun', article: 'het' };
const food: Pack = {
  id: 'food',
  title: 'Food',
  facts: [{ text: 'The Dutch put chocolate sprinkles (hagelslag) on bread.', about: { kind: 'pack', id: 'food' } }],
  cards: [appel, brood],
};

function startFood(result: ShareResult = 'shared') {
  const share = createFakeShare(result);
  render(<App packs={[food]} store={createMemoryProgressStore()} clock={createFakeClock(new Date('2026-01-01T10:00:00Z'))} random={() => 0.5} share={share} />);
  fireEvent.click(screen.getByRole('button', { name: /Food/ }));
  return share;
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const reportCard = 'Report a mistake in this Card';
const reportFact = 'Report a mistake in this Fact';

describe('Mistake reports', () => {
  it('reports a Card by its id, with the Dutch and the meaning', async () => {
    const share = startFood();
    click('apple');

    click(reportCard);

    expect(share.sent).toEqual([mistakeReport({ kind: 'card', id: 'food-01' }, '“de appel” means “apple”')]);
    expect(share.sent[0]).toContain('food-01');
    expect(await screen.findByText('Thanks! Your Mistake report is on its way.')).toBeTruthy();
  });

  it('reports every Card, even one without notes, and after a wrong answer', () => {
    const share = startFood();
    click('apple');
    click('Next');
    click('apple'); // brood means bread

    click(reportCard);

    expect(share.sent).toEqual([mistakeReport({ kind: 'card', id: 'food-03' }, '“het brood” means “bread”')]);
  });

  it('reports a Card’s Fact by the Card it belongs to, with its text', () => {
    const share = startFood();
    click('apple');

    const fact = screen.getByRole('complementary');
    fireEvent.click(within(fact).getByRole('button', { name: reportFact }));

    expect(share.sent).toEqual([mistakeReport({ kind: 'fact', about: { kind: 'card', id: 'food-01' } }, 'Appeltaart (apple pie) is a Dutch favourite.')]);
  });

  it('reports a Pack’s Fact by the Pack it belongs to, with its text', () => {
    const share = startFood();
    click('apple');
    click('Next');
    click('bread');
    click('Next');

    click(reportFact);

    expect(share.sent).toEqual([mistakeReport({ kind: 'fact', about: { kind: 'pack', id: 'food' } }, 'The Dutch put chocolate sprinkles (hagelslag) on bread.')]);
  });

  it('says nothing more when the Learner closes the share sheet', async () => {
    const share = startFood('cancelled');
    click('apple');
    click(reportCard);

    await Promise.resolve();
    expect(share.sent).toHaveLength(1);
    expect(screen.queryByText(/Thanks!/)).toBeNull();
    expect(screen.queryByText(/Copied/)).toBeNull();
    expect(screen.getByRole('button', { name: reportCard })).toBeTruthy();
  });

  it('offers the message to copy when the device can’t share', async () => {
    startFood('copied');
    click('apple');
    click(reportCard);

    expect(await screen.findByText(/Copied! Paste it into a message/)).toBeTruthy();
  });

  it('shows the message to copy by hand when the device can neither share nor copy', async () => {
    startFood('unavailable');
    click('apple');
    click(reportCard);

    const box = (await screen.findByRole('textbox', { name: /Copy this message/ })) as HTMLTextAreaElement;
    expect(box.value).toBe(mistakeReport({ kind: 'card', id: 'food-01' }, '“de appel” means “apple”'));
  });
});
