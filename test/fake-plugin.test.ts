import { describe, expect, it } from 'vitest';
import { init } from '../src/plugins/fake-plugin';
import { createMockApi } from './helpers/mockApi';

describe('fake plugin', () => {
  it('registers say alias and forwards captured text', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const fakeAlias = aliases.find((alias) => alias.pattern.test('say hello world'));
    expect(fakeAlias).toBeDefined();

    const result = fakeAlias!.callback(['say hello world', 'hello world'] as unknown as RegExpMatchArray);

    expect(api.command.send).toHaveBeenCalledWith('/fake --> hello world');
    expect(result).toBe(true);
  });

  it('handles say without text', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const fakeAlias = aliases.find((alias) => alias.pattern.test('say'));
    expect(fakeAlias).toBeDefined();

    const result = fakeAlias!.callback(['say'] as unknown as RegExpMatchArray);

    expect(api.command.send).toHaveBeenCalledWith('/fake --> ');
    expect(result).toBe(true);
  });
});
