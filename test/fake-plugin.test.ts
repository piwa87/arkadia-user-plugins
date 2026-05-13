import { describe, expect, it } from 'vitest';
import { init } from '../src/plugins/fake-plugin';
import { createMockApi } from './helpers/mockApi';

describe('fake plugin', () => {
  it('registers /fake alias and echoes quoted text', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const fakeAlias = aliases.find((alias) => alias.pattern.test("/fake 'hello world'"));
    expect(fakeAlias).toBeDefined();

    const result = fakeAlias!.callback(["/fake 'hello world'", 'hello world'] as unknown as RegExpMatchArray);

    expect(api.command.send).toHaveBeenCalledWith('echo hello world');
    expect(result).toBe(true);
  });

  it('uses a default awesome message when text is missing', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const fakeAlias = aliases.find((alias) => alias.pattern.test('/fake'));
    expect(fakeAlias).toBeDefined();

    const result = fakeAlias!.callback(['/fake'] as unknown as RegExpMatchArray);

    expect(api.command.send).toHaveBeenCalledWith(
      'echo GitHub Copilot reporting in: fast, focused, and slightly over-caffeinated.',
    );
    expect(result).toBe(true);
  });
});
