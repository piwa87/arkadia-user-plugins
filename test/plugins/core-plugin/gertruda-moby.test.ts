import { describe, expect, it, vi } from 'vitest';
import { setupGertrudaMoby } from '../../../src/plugins/core-plugin/gertruda/moby';
import { createMockApi, runLine } from '../../helpers/mockApi';

describe('Gertruda troll tracking', () => {
  it.each([
    'Wielki cuchnacy troll.',
    'Cialo wielkiego cuchnacego trolla.',
    'Sterta szczatkow trolla.',
  ])('tracks %s only while enabled', (description) => {
    const mock = createMockApi();
    setupGertrudaMoby(mock.api);
    const enable = mock.aliases.find(({ pattern }) => pattern.test('/gt+'))!;
    const disable = mock.aliases.find(({ pattern }) => pattern.test('gt-'))!;

    expect(runLine(mock, description)?.text).toBe(description);
    expect(mock.api.command.send).not.toHaveBeenCalled();
    expect(enable.callback()).toBe(true);
    expect(runLine(mock, description)?.text).toBe(description);
    expect(mock.api.command.send).toHaveBeenCalledExactlyOnceWith('/mob gt');

    vi.mocked(mock.api.command.send).mockClear();
    runLine(mock, 'Wielki cuchnacy troll atakuje cie!');
    runLine(mock, 'Cialo wielkiego cuchnacego ogra.');
    expect(disable.callback()).toBe(true);
    runLine(mock, description);
    expect(mock.api.command.send).not.toHaveBeenCalled();
  });
});
