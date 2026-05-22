import type { PluginApi } from '@arkadia/plugin-types';

export function setupBindAliases(api: PluginApi): void {
  api.aliases.register(/^f\+\s+(.+)$/i, (matches) => {
    if (!matches?.[1]) {
      api.output.print('Usage: f+ <command>');
      return true;
    }

    const command = matches[1].trim();

    api.bind.set(command, undefined, true);

    const bindLabel = api.bind.getLabel();
    const buffer = new api.AnsiAwareBuffer();
    buffer.append('[Bind] ', api.colors.fromHex('#00ffaf'));
    buffer.append('f', api.colors.fromHex('#ffd787'));
    buffer.append(' → ', api.colors.fromHex('#00ffaf'));
    buffer.append(command, api.colors.fromHex('#ffffff'));
    api.output.print(buffer);
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
