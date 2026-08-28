import { describe, expect, it, vi } from 'vitest';
import type { HerbsData, PluginApi } from '@arkadia/plugin-types';
import { setupGatherAliases, sellJunkHerbs } from '../../../src/plugins/core-plugin/ziola/aliases';
import { cleanupPakujZiola, pakujZiola } from '../../../src/plugins/core-plugin/ziola/pakuj';
import { createMockApi, runLine } from '../../helpers/mockApi';

const herbData: HerbsData = {
  version: 1,
  herb_id_to_odmiana: {},
  herb_id_to_use: {
    lecznicze: [{ action: 'zjedz', effect: 'leczy' }],
    trawa: [{ action: '', effect: '', smokable: true }],
    skrzyp: [],
  },
};

function withHerbs(api: PluginApi, data: HerbsData | null = herbData): {
  getData: ReturnType<typeof vi.fn>;
  getBags: ReturnType<typeof vi.fn>;
  take: ReturnType<typeof vi.fn>;
} {
  const herbs = {
    getData: vi.fn(async () => data),
    getBags: vi.fn(() => ({
      1: { herbs: { lecznicze: 2, trawa: 3 } },
      2: { herbs: { skrzyp: 1, trawa: 0 } },
    })),
    take: vi.fn(async (_herbId: string, amount: number) => amount),
    put: vi.fn(),
    move: vi.fn(),
  };

  Object.assign(api, { herbs });
  return herbs;
}

describe('ziola aliases', () => {
  it('gags bag output for every shared packing call', () => {
    const mock = createMockApi();

    pakujZiola(mock.api, 2, 3);

    expect(runLine(mock, 'Otwierasz woreczek.')).toBeNull();
    expect(runLine(mock, 'Zamykasz woreczek.')).toBeNull();
    expect(mock.api.command.send).toHaveBeenCalledWith('otworz woreczki', false);
    expect(mock.api.command.send).toHaveBeenCalledWith('wloz ziola do 3. woreczka', false);
    expect(mock.api.command.send).toHaveBeenCalledWith('wloz ziola do 4. woreczka', false);
    expect(mock.api.command.send).toHaveBeenCalledWith('zamknij woreczki', false);

    cleanupPakujZiola(mock.api);
    expect(mock.tokenTriggers).toHaveLength(0);
  });

  it('takes all junk herbs before selling them together', async () => {
    const { api } = createMockApi();
    const herbs = withHerbs(api);

    const operations: string[] = [];
    herbs.take.mockImplementation(async (herbId: string, amount: number) => {
      operations.push(`take:${herbId}`);
      return amount;
    });
    vi.mocked(api.command.send).mockImplementation(async (command: string) => {
      operations.push(`send:${command}`);
    });

    await sellJunkHerbs(api);

    expect(herbs.take.mock.calls).toEqual([
      ['trawa', 3, 1],
      ['skrzyp', 1, 2],
    ]);
    expect(api.command.send).toHaveBeenCalledTimes(1);
    expect(api.command.send).toHaveBeenCalledWith('sprzedaj ziola');
    expect(operations).toEqual([
      'take:trawa',
      'take:skrzyp',
      'send:sprzedaj ziola',
    ]);
  });

  it('works even when herb data is unavailable (list-based match)', async () => {
    const { api } = createMockApi();
    const herbs = withHerbs(api, null);

    await sellJunkHerbs(api);

    // SELL_LIST is hardcoded so it doesn't need getData()
    expect(herbs.take).toHaveBeenCalledTimes(2);
    expect(api.command.send).toHaveBeenCalledWith('sprzedaj ziola');
  });

  it('registers spziola as a handled command', () => {
    const mock = createMockApi();
    withHerbs(mock.api);
    setupGatherAliases(mock.api);

    const alias = mock.aliases.find(({ pattern }) => pattern.test('spziola'));

    expect(alias).toBeDefined();
    expect(alias?.callback('spziola'.match(alias.pattern) ?? undefined)).toBe(true);
  });
});
