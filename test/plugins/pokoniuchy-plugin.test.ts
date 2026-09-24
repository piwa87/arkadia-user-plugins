import { describe, expect, it } from 'vitest';
import { destroy, init } from '../../src/plugins/pokoniuchy-plugin';
import { createMockApi } from '../helpers/mockApi';

describe('pokoniuchy-plugin', () => {
  it('loads Pokoniuchy as a standalone plugin and cleans up on destroy', async () => {
    const mock = createMockApi();

    const info = await init(mock.api);

    expect(info).toMatchObject({ name: '(s)poko pluuuug', version: '1.0.0' });
    expect(mock.aliases.some((alias) => alias.pattern.test('poko_help'))).toBe(true);
    expect(mock.tokenTriggers.length).toBeGreaterThan(0);
    expect(new Set(mock.tokenTriggers.map((trigger) => trigger.tag))).toEqual(
      new Set(['pokoniuchyStandalone']),
    );
    expect(mock.eventListeners.get('parsedObjects')).toHaveLength(1);

    await destroy();

    expect(mock.tokenTriggers).toHaveLength(0);
    expect(mock.eventListeners.get('parsedObjects')).toHaveLength(0);
    expect(mock.api.triggers.removeByTag).toHaveBeenCalledWith('pokoniuchyStandalone');
  });
});
