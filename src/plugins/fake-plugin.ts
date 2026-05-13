import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';

export async function init(api: PluginApi): Promise<PluginInfo> {
  api.aliases.register(/^\/fake(?:\s+'([^']+)')?$/, (matches) => {
    const rawText = matches?.[1]?.trim();
    const text = rawText && rawText.length > 0
      ? rawText
      : 'GitHub Copilot reporting in: fast, focused, and slightly over-caffeinated.';

    api.command.send(`echo ${text}`);
    return true;
  });

  return {
    name: 'Fake Echo Plugin',
    version: '0.1.0',
    description: 'Adds /fake alias for quick local echo text.',
  };
}
