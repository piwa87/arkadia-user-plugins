import { describe, expect, it } from 'vitest';
import { destroy, init } from '../../../src/plugins/core-plugin';
import { createMockApi } from '../../helpers/mockApi';

describe('core-plugin destroy', () => {
  it('removes every trigger, one-time trigger, token trigger and event listener', async () => {
    const mock = createMockApi();
    await init(mock.api);

    expect(mock.triggers.length).toBeGreaterThan(0);

    // Arm a one-shot temp trigger through the szuk! alias so destroy() has a
    // pending one-time trigger to clean up as well.
    const szuk = mock.aliases.find((a) => a.pattern.source.includes('szuk'));
    expect(szuk).toBeDefined();
    szuk!.callback('szuk! skrzynia'.match(szuk!.pattern) as RegExpMatchArray);
    expect(mock.oneTimeTriggers.length).toBeGreaterThan(0);

    await destroy();

    // If this fails after adding a module with a new trigger tag, add the tag
    // to TRIGGER_TAGS in src/plugins/core-plugin/index.ts.
    const leakedTags = [...new Set([...mock.triggers, ...mock.oneTimeTriggers, ...mock.tokenTriggers].map((t) => t.tag))];
    expect(leakedTags).toEqual([]);

    const leakedListeners = [...mock.eventListeners.entries()]
      .filter(([, listeners]) => listeners.length > 0)
      .map(([event]) => event);
    expect(leakedListeners).toEqual([]);
  });
});
