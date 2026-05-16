import type { PluginApi } from '@arkadia/plugin-types';

export function registerTextAlias(api: PluginApi, pattern: RegExp, command: string): void {
  api.aliases.register(pattern, (matches) => {
    const text = matches?.[1]?.trim();
    api.command.send(text ? `${command} ${text}` : command);
    return true;
  });
}
