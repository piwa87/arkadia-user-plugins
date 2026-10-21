import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupGatherAliases, cleanupGatherAliases } from '../../../src/plugins/core-plugin/ziola/aliases';
import { setupPrrAlias } from '../../../src/plugins/core-plugin/misc/prr';
import { createMockApi } from '../../helpers/mockApi';

describe('gather emergency stop', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
  it.each(['prr', 'unload'])('cancels every pending gathering timer on %s and allows a fresh sequence', mode => {
    const mock = createMockApi();
    setupGatherAliases(mock.api);
    setupPrrAlias(mock.api);
    const run = (text: string) => {
      const alias = mock.aliases.find(a => a.pattern.test(text))!;
      alias.callback(text.match(alias.pattern)!);
    };
    run('zii w 4');
    run('zii e 4');
    run('/zio_szukaj');
    vi.advanceTimersByTime(7000);
    if (mode === 'prr') run('prr');
    else cleanupGatherAliases(mock.api);
    vi.mocked(mock.api.command.send).mockClear();
    vi.advanceTimersByTime(120000);
    expect(mock.api.command.send).not.toHaveBeenCalled();
    if (mode === 'prr') {
      run('zii n 4');
      vi.advanceTimersByTime(7000);
      expect(mock.api.command.send).toHaveBeenCalledWith('n');
      expect(vi.mocked(mock.api.command.send).mock.calls.filter(c => c[0] === 'szukaj ziol')).toHaveLength(2);
    }
    cleanupGatherAliases(mock.api);
  });
});
