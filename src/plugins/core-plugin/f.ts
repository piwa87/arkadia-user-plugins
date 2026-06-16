import type { PluginApi } from '@arkadia/plugin-types';

export function setBind(api: PluginApi, command: string, options?: { once?: boolean; label?: string }): void {
  const once = options?.once ?? false;
  api.bind.set(command, undefined, once || undefined);

  if (once) {
    const buffer = new api.AnsiAwareBuffer();
    buffer.append('one time bind', api.colors.fromHex('#ff7675'));
    api.output.print(buffer);
  }
}

export function setupBindAliases(api: PluginApi): void {
  // f+ <command>   — persistent bind
  // f+! <command>  — one-shot bind (clears after use)
  // Use | as separator for multi-commands (e.g. f+ cmd1|cmd2|cmd3)
  api.aliases.register(/^f\+(!?)\s+(.+)$/i, (matches) => {
    const once = matches?.[1] === '!';
    let command = matches?.[2]?.trim();

    if (!command) {
      api.output.print('Usage: f+ <command>  |  f+! <command> (one-shot)');
      return true;
    }

    // Replace | separator with ; for multi-commands
    command = command.replace(/\|/g, ';');

    setBind(api, command, { once });
    return true;
  });

  api.aliases.register(/^f$/i, () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.events.emit as any)('executeFunctionalBind');
    return true;
  });

  api.aliases.register(/^f-$/i, () => {
    api.bind.clear();
    api.output.print('Bind cleared');
    return true;
  });
}
