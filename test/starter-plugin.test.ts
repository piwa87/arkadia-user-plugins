import { describe, expect, it } from 'vitest';
import { init } from '../src/plugins/starter-plugin';
import { createMockApi, createMockLine } from './helpers/mockApi';

describe('starter plugin', () => {
  it('registers a trigger and colors a matched word', async () => {
    const { api, triggers } = createMockApi();
    await init(api);

    expect(triggers).toHaveLength(1);
    expect(triggers[0].tag).toBe('starterPlugin');

    const line = createMockLine('alarm ahead');
    const result = triggers[0].callback(line, ['alarm'] as unknown as RegExpMatchArray);

    expect(line.color).toHaveBeenCalledWith([0, 5], { type: 'hex', value: '#d97706' });
    expect(result).toEqual({ text: 'alarm ahead', appliedRange: [0, 5] });
  });

  it('registers an alias that sends a command', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const starterAlias = aliases.find((alias) => alias.pattern.test('/starter test'));
    expect(starterAlias).toBeDefined();

    const result = starterAlias!.callback(['/starter test', 'test'] as unknown as RegExpMatchArray);

    expect(api.command.send).toHaveBeenCalledWith('powiedz test');
    expect(result).toBe(true);
  });
});
