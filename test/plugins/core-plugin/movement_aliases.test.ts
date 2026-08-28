import { describe, expect, it, vi } from 'vitest';
import { setupMovementAliases } from '../../../src/plugins/core-plugin/movement/movement_aliases';
import { createMockApi } from '../../helpers/mockApi';

describe('movement aliases', () => {
  it('runs the vid movement sequence in order', () => {
    const mock = createMockApi();
    setupMovementAliases(mock.api);
    const alias = mock.aliases.find((entry) => entry.pattern.test('vid'))!;

    alias.callback('vid'.match(alias.pattern) as RegExpMatchArray);

    expect(mock.api.output.print).toHaveBeenCalledWith('--> ruszam');
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/dalej 2',
      '/walkerw',
    ]);
  });
});
