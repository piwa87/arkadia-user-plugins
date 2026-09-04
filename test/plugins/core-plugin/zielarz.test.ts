import { describe, expect, it, vi } from 'vitest';
import type { PluginApi } from '@arkadia/plugin-types';
import { pickGmcpExit, pickUnvisitedExit, setupZielarz } from '../../../src/plugins/core-plugin/ziola/zielarz';
import { setupPrrAlias } from '../../../src/plugins/core-plugin/misc/prr';
import { createMockApi } from '../../helpers/mockApi';

function room(exits: Record<string, number>) {
  return { exits } as NonNullable<ReturnType<PluginApi['map']['getRoom']>>;
}

describe('zielarz', () => {
  it('only chooses exits leading to unvisited rooms', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(pickUnvisitedExit(room({ north: 2, east: 3 }), new Set([2]))).toBe('e');
    expect(pickUnvisitedExit(room({ north: 2 }), new Set([2]))).toBeNull();
  });

  it('uses the server-reported GMCP exits as commands', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(pickGmcpExit(['polnoc', 'wschod'])).toBe('n');
    expect(pickGmcpExit([])).toBeNull();
  });

  it('registers start and stop aliases', () => {
    const mock = createMockApi();
    const cleanup = setupZielarz(mock.api);

    expect(mock.aliases.some(({ pattern }) => pattern.test('ziel'))).toBe(true);
    expect(mock.aliases.some(({ pattern }) => pattern.test('ziel!'))).toBe(true);

    cleanup();
    expect(mock.api.aliases.remove).toHaveBeenCalledTimes(2);
  });

  it('prr stops the route and sends the client stop command', () => {
    const mock = createMockApi();
    setupPrrAlias(mock.api);

    const prr = mock.aliases.find(({ pattern }) => pattern.test('prr'));
    expect(prr?.callback('prr'.match(prr.pattern) ?? undefined)).toBe(true);
    expect(mock.api.command.send).toHaveBeenCalledWith('/stop');
  });
});
