import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApi, runLine, type MockApi } from '../../../helpers/mockApi';
import {
  destroyManewr,
  setupManewr,
} from '../../../../src/plugins/core-plugin/mod_team/manewr';

const TAG = 'manewr_test';
const MANEUVER_READY = `${'   '.repeat(10)}m a n e w r u j${'  '.repeat(10)}m a n e w r u j`;
const ORDER_READY =
  '                r o z k a z u j                     r o z k a z u j ';

function output(mock: MockApi): string[] {
  return (mock.api.output.print as any).mock.calls.map(([value]: [any]) =>
    typeof value === 'string' ? value : (value?.text ?? ''),
  );
}

function runAlias(mock: MockApi, command: string): void {
  const alias = mock.aliases.find((candidate) => candidate.pattern.test(command));
  if (!alias) throw new Error(`brak aliasu dla: ${command}`);
  expect(alias.callback(command.match(alias.pattern) ?? undefined)).toBe(true);
}

describe('mod_team — manewr', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports maneuver alarm time left in milliseconds', () => {
    const mock = createMockApi();
    setupManewr(mock.api, TAG);
    runAlias(mock, 'kol_manewr');

    vi.advanceTimersByTime(1250);
    const text = 'Nie jestes jeszcze gotowy do wykonania kolejnego manewru.';
    expect(runLine(mock, text)?.text).toBe(text);
    expect(output(mock)).toEqual(['--> 3750 msek']);

    destroyManewr(mock.api);
  });

  it('reports order alarm time left in seconds, including fractions', () => {
    const mock = createMockApi();
    setupManewr(mock.api, TAG);
    runAlias(mock, 'kol_rozkaz');

    vi.advanceTimersByTime(2500);
    const text = 'Nie jestes jeszcze gotowa, by moc wydac jakis rozkaz.';
    expect(runLine(mock, text)?.text).toBe(text);
    expect(output(mock)).toEqual(['--> 12.5 sek.']);

    destroyManewr(mock.api);
  });

  it('prints the exact manewruj line when the five-second alarm fires', () => {
    const mock = createMockApi();
    setupManewr(mock.api, TAG);
    runAlias(mock, 'kol_manewr');

    vi.advanceTimersByTime(5000);
    expect(output(mock)).toEqual([MANEUVER_READY]);

    destroyManewr(mock.api);
  });

  it('prints blank lines around two exact rozkazuj lines after fifteen seconds', () => {
    const mock = createMockApi();
    setupManewr(mock.api, TAG);
    runAlias(mock, 'kol_rozkaz');

    vi.advanceTimersByTime(15_000);
    expect(output(mock)).toEqual(['', ORDER_READY, ORDER_READY, '']);

    destroyManewr(mock.api);
  });

  it('supports the manual man! alias and cancels pending alarms on destroy', () => {
    const mock = createMockApi();
    setupManewr(mock.api, TAG);

    runAlias(mock, 'man!');
    runAlias(mock, 'kol_manewr');
    destroyManewr(mock.api);
    vi.advanceTimersByTime(5000);

    expect(output(mock)).toEqual([MANEUVER_READY]);
  });
});
