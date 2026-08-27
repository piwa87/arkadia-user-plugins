import { describe, expect, it } from 'vitest';
import { setupLootAliases } from '../../../src/plugins/core-plugin/loot';
import { createMockApi } from '../../helpers/mockApi';

describe('loot aliases', () => {
  it.each([1, 10, 20])('t%d takes and evaluates the shield', (n) => {
    const mock = createMockApi();
    setupLootAliases(mock.api);

    const alias = mock.aliases.find(({ pattern }) => pattern.test(`t${n}`));
    expect(alias).toBeDefined();
    expect(alias?.callback()).toBe(true);
    expect(mock.api.command.send).toHaveBeenNthCalledWith(1, `wez tarcze z ${n}. ciala`);
    expect(mock.api.command.send).toHaveBeenNthCalledWith(2, 'ocen tarcze');
  });
});
