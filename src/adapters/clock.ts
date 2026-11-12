export type Clock = { now(): Date };

export const systemClock: Clock = { now: () => new Date() };

export type FakeClock = Clock & { set(date: Date): void; advance(ms: number): void };

export function createFakeClock(start: Date): FakeClock {
  let time = start.getTime();
  return {
    now: () => new Date(time),
    set: (date) => {
      time = date.getTime();
    },
    advance: (ms) => {
      time += ms;
    },
  };
}
