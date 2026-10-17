import { describe, expect, it, vi } from 'vitest';
import { setupTravelAliases } from '../../../src/plugins/core-plugin/movement/travel_aliases';
import { setupWsiadaczAliases } from '../../../src/plugins/core-plugin/movement/wsiadacz';
import { createMockApi, MockAnsiAwareBuffer, runLine } from '../../helpers/mockApi';

describe('wagon boarding', () => {
  it('boards a ship silently, without pouch aliases re-enabling echoes', () => {
    const mock = createMockApi();
    setupTravelAliases(mock.api);
    expect(mock.aliases.find(({ pattern }) => pattern.test('op'))?.callback()).toBe(true);
    expect(vi.mocked(mock.api.command.send).mock.calls).toEqual([
      ['na_statek', false],
      ['wem', false],
      ['kup bilet', false],
      ['wejdz na tratwe', false],
      ['wejdz na statek', false],
      ['wlm', false],
    ]);
  });

  it('sends the three boarding attempts without command echoes', () => {
    const mock = createMockApi();
    setupTravelAliases(mock.api);

    expect(mock.aliases.find(({ pattern }) => pattern.test('opw'))?.callback()).toBe(true);
    expect((mock.api.command.send as any).mock.calls).toEqual([
      ['otm'],
      ['wsiadz do dylizansu', false],
      ['wsiadz do wozu', false],
      ['wsiadz do powozu', false],
      ['ztm'],
    ]);
  });

  it.each(['wsiadz do dylizansu', 'wsiadz do wozu', 'wsiadz do powozu'])(
    'suppresses the echo of a directly bound command: %s',
    (command) => {
      const mock = createMockApi();
      setupTravelAliases(mock.api);
      const hook = mock.commandHooks[0].callback;

      expect(hook(command, true)).toBeNull();
      expect(mock.api.command.send).toHaveBeenCalledExactlyOnceWith(command, false);
      expect(hook(command, false)).toBeUndefined();
    },
  );

  it.each(['dylizansu', 'wozu', 'powozu'])(
    'shows a boarding confirmation for a paid ride in a %s',
    (vehicle) => {
      const mock = createMockApi();
      setupWsiadaczAliases(mock.api);
      const announcement = `Oplacasz podroz u woznicy i wsiadasz do szarego stojacego ${vehicle}.`;

      expect(runLine(mock, announcement)?.text).toBe(announcement);
      expect((mock.api.output.print as any).mock.calls.map(([text]: [string | MockAnsiAwareBuffer]) =>
        text instanceof MockAnsiAwareBuffer ? text.text : text,
      )).toEqual([
        '                            ',
        '     WSIADLES DO POJAZDU!     ',
        '                            ',
      ]);
    },
  );

  it('does not confirm boarding for an unrelated driver announcement', () => {
    const mock = createMockApi();
    setupWsiadaczAliases(mock.api);
    runLine(mock, 'Z zewnatrz slyszysz glos woznicy: Fermata - incrocio alla Urbimo!');
    expect(mock.api.output.print).not.toHaveBeenCalled();
  });
});
