import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupLootShitAliases } from '../../../src/plugins/core-plugin/loot-shit';
import { createMockApi } from '../../helpers/mockApi';

function runAlias(mock: ReturnType<typeof createMockApi>, command: string): void {
  const alias = mock.aliases.find((entry) => entry.pattern.test(command));
  if (!alias) throw new Error(`Alias not found: ${command}`);
  alias.callback(command.match(alias.pattern) ?? undefined);
}

function sentCommands(mock: ReturnType<typeof createMockApi>): string[] {
  return (mock.api.command.send as ReturnType<typeof import('vitest').vi.fn>).mock.calls.map(
    ([command]) => command,
  );
}

describe('loot shit aliases', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('enables scrap mode and prepares the worn sack', () => {
    const mock = createMockApi();
    setupLootShitAliases(mock.api);

    runAlias(mock, 'zlom+');

    expect(sentCommands(mock)).toEqual([
      'poodepnij wyszukana pochwe',
      'przewies worek przez prawe ramie',
      'otworz worek',
    ]);
    expect(mock.api.output.print).toHaveBeenCalledWith('[zlom] tryb wlaczony');
  });

  it('fills the worn backpack and sack with HAS loot', () => {
    const mock = createMockApi();
    setupLootShitAliases(mock.api);

    runAlias(mock, 'whas');

    const commands = sentCommands(mock);
    expect(commands).toContain('ciemne plytkowe lewe naramienniki'.replace(/^/, 'wez '));
    expect(commands.slice(-2)).toEqual([
      'napelnij zalozony plecak',
      'napelnij zalozony worek',
    ]);
    expect(commands).toHaveLength(19);
  });

  it('disables scrap mode and restores the scabbard', () => {
    const mock = createMockApi();
    setupLootShitAliases(mock.api);

    runAlias(mock, 'zlom+');
    runAlias(mock, 'zlom-');

    expect(sentCommands(mock).slice(-2)).toEqual([
      'zdejmij worek',
      'poprzypnij wyszukana pochwe na plecach',
    ]);
    expect(mock.api.output.print).toHaveBeenLastCalledWith('[zlom] tryb wylaczony');
  });

  it('uses the original selling sequence', async () => {
    vi.useFakeTimers();
    const mock = createMockApi();
    setupLootShitAliases(mock.api);

    runAlias(mock, 'sphas');
    await vi.runAllTimersAsync();

    const commands = sentCommands(mock);
    expect(commands).toEqual([
      'sprzedaj wszystkie tarcze',
      'sprzedaj kolczugi',
      'napt',
      'wyj bronie',
      'sprzedaj je',
      'napt',
      'wyjzb',
      'sprzedaj je',
      'napt',
      'wyj bronie',
      'sprzedaj je',
      'napt',
      'wyjzb',
      'sprzedaj je',
      'oproznij worek',
    ]);
    expect(
      (mock.api.command.send as ReturnType<typeof import('vitest').vi.fn>).mock.calls.every(
        ([, echo]) => echo === false,
      ),
    ).toBe(true);
  });
});
