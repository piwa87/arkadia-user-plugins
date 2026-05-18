import type { PluginApi } from '@arkadia/plugin-types';

export function setupHelpAliases(api: PluginApi): void {
  const printHelp = () => {
    const cmdColor = api.colors.fromHex('#7dd3fc');
    const borderColor = api.colors.fromHex('#4b5563');

    const entries: [string, string][] = [
      ['?alias', 'show this help'],
      ['b* presets', 'b_wsiowe bakb bbod bcz bgb bgrz bhas bjas bkis bkur bryb bstr bszcz bu bwy bzbo bzol'],
      ['c [target]', 'zabij CEL (or named target)'],
      ['c1 / c2 / c3 / c4', 'attack target 1–4'],
      ['kill <target>', 'zabij target + play glass sound'],
      ['la+', 'lamp on sequence'],
      ['la-', 'lamp off sequence'],
      ['napt', 'open worn bag and fill it'],
      ['ned+', 'arrival trigger, send: ned'],
      ['obb', 'look into worn bag'],
      ['op+', 'arrival trigger, send: op'],
      ['op++', 'arrival trigger, send: op + ned'],
      ['ot', 'open worn bag'],
      ['pj <text>', 'przejrzyj <text>'],
      ['pr <text>', 'przeczytaj <text>'],
      ['set <target>', 'set targets 1–4 with ordinal prefixes'],
      ['set1–4 <what>', 'set individual target verbatim'],
      ['test-arrival', 'simulate ship arrival line'],
      ['wlz <what>', 'put into worn bag (| for multiple)'],
      ['wned+', 'arrival trigger, send: wned'],
      ['wop+', 'arrival trigger, send: wop'],
      ['wyj <what>', 'take from worn bag (| for multiple)'],
      ['zt', 'close worn bag'],
      ['emotes', 'ce, cmo, haha, hm?, kiw, krz1, krz2, kurw, ma, mach, obr, par, pod, pok, pokr, roll, roz, semig, superwejscie, usr1–3, uwa, wypat, wyb, wytr, wys1–2, zag, zagw, zam, zar, zat, zd'],
    ];

    const cmdW = Math.max(...entries.map(([c]) => c.length));
    const descW = Math.max(...entries.map(([, d]) => d.length));
    const inner = 1 + cmdW + 2 + descW + 1;
    const hr = '─'.repeat(inner);
    const title = ' My Aliases';

    const printBorder = (text: string) => {
      const buf = new api.AnsiAwareBuffer(text);
      buf.color([0, text.length], borderColor);
      api.output.print(buf);
    };

    printBorder(`┌${hr}┐`);
    printBorder(`│${title.padEnd(inner)}│`);
    printBorder(`├${hr}┤`);

    for (const [cmd, desc] of entries) {
      const row = `│ ${cmd.padEnd(cmdW)}  ${desc.padEnd(descW)} │`;
      const buf = new api.AnsiAwareBuffer(row);
      buf.color([2, 2 + cmd.length], cmdColor);
      api.output.print(buf);
    }

    printBorder(`└${hr}┘`);
  };

  api.aliases.register(/^\?alias$/, () => {
    printHelp();
    return true;
  });
}
