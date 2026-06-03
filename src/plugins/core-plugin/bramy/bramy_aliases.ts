import type { PluginApi, FormatStateSnapshot } from '@arkadia/plugin-types';

export function setupBramyAliases(api: PluginApi): void {
  // br - knock on gate
  api.aliases.register(/^br$/, () => {
    api.command.send('zastukaj we wrota');
    return true;
  });

  // br2 - ring bell/gong/pull cord
  api.aliases.register(/^br2$/, () => {
    api.command.send('uderz w dzwon');
    api.command.send('uderz w gong');
    api.command.send('pociagnij sznurek');
    api.command.send('pociagnij linke');
    return true;
  });

  // br! — preview both gate-state labels in the output window
  api.aliases.register(/^br!$/, () => {
    const otwarteColor: FormatStateSnapshot = {
      foreground: api.colors.fromHex('#ffffff').foreground,
      background: api.colors.fromHex('#aa0000').foreground,
    };
    const zamknieteColor: FormatStateSnapshot = {
      foreground: api.colors.fromHex('#ffffff').foreground,
      background: api.colors.fromHex('#008800').foreground,
    };

    const buf1 = new api.AnsiAwareBuffer();
    buf1.append('   OTWARTE   ', otwarteColor);
    api.output.print(buf1);

    const buf2 = new api.AnsiAwareBuffer();
    buf2.append('   ZAMKNIETE   ', zamknieteColor);
    api.output.print(buf2);

    return true;
  });
}
