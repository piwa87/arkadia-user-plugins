import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { findMatchRange } from '../lib/findMatchRange';
import { registerTextAlias as _registerTextAlias } from '../lib/registerTextAlias';

export async function init(api: PluginApi): Promise<PluginInfo> {
  const tag = 'starterPlugin';
  const accent = api.colors.fromHex('#d97706');
  const arrivalPattern = /(.* (?:z wolna doplywa|przybija) do brzegu\.)/i;

  // ── helpers ──────────────────────────────────────────────────────────────

  const runAfterRandomDelay = (callback: () => void) => {
    const delay = Math.floor(Math.random() * (2900 - 768 + 1)) + 768;
    setTimeout(callback, delay);
  };

  const armArrivalTrigger = (label: string, callback: () => void) => {
    api.triggers.registerOneTime(
      arrivalPattern,
      (line) => {
        runAfterRandomDelay(callback);
        return line;
      },
      tag,
    );

    api.output.print(`Temp trigger armed: waiting for arrival (${label})`);
  };

  const registerSendAlias = (pattern: RegExp, label: string, command: string) => {
    api.aliases.register(pattern, () => {
      armArrivalTrigger(label, () => {
        api.command.send(command);
      });
      return true;
    });
  };

  const registerTextAlias = (pattern: RegExp, command: string) => _registerTextAlias(api, pattern, command);

  const printHelp = () => {
    const cmdColor = api.colors.fromHex('#7dd3fc');
    const borderColor = api.colors.fromHex('#4b5563');

    const entries: [string, string][] = [
      ['alias!', 'show this help'],
      ['b* presets', 'b_wsiowe bakb bbod bcz bgb bgrz bhas bjas bkis bkur bryb bstr bszcz bu bwy bzbo bzol'],
      ['c [target]', 'zabij CEL (or named target)'],
      ['c1 / c2 / c3 / c4', 'attack target 1–4'],
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
    ];

    const cmdW = Math.max(...entries.map(([c]) => c.length));
    const descW = Math.max(...entries.map(([, d]) => d.length));
    const inner = 1 + cmdW + 2 + descW + 1;
    const hr = '\u2500'.repeat(inner);
    const title = ' My Aliases';

    const printBorder = (text: string) => {
      const buf = new api.AnsiAwareBuffer(text);
      buf.color([0, text.length], borderColor);
      api.output.print(buf);
    };

    printBorder(`\u250c${hr}\u2510`);
    printBorder(`\u2502${title.padEnd(inner)}\u2502`);
    printBorder(`\u251c${hr}\u2524`);

    for (const [cmd, desc] of entries) {
      const row = `\u2502 ${cmd.padEnd(cmdW)}  ${desc.padEnd(descW)} \u2502`;
      const buf = new api.AnsiAwareBuffer(row);
      buf.color([2, 2 + cmd.length], cmdColor);
      api.output.print(buf);
    }

    printBorder(`\u2514${hr}\u2518`);
  };

  // ── target state ─────────────────────────────────────────────────────────

  const ORDINALS = ['1. ', '2. ', '3. ', '4. '];
  const targets = ['cel1', 'cel2', 'cel3', 'cel4'];

  const renderTargetFooter = () =>
    targets
      .map((t, i) => `<span style="opacity:0.6">[t${i + 1}]</span> ${t}`)
      .join(' <span style="opacity:0.4">|</span> ');

  const footerHandle = api.ui.registerFooterComponent('targets', renderTargetFooter(), 'start');

  const updateFooter = () => {
    footerHandle.setContent(renderTargetFooter());
  };

  const printTargets = () => {
    for (let i = 0; i < 4; i++) {
      api.output.print(`[t${i + 1}] ${targets[i]}`);
    }
  };

  // ── triggers ─────────────────────────────────────────────────────────────

  api.triggers.register(
    arrivalPattern,
    (line, matches) => {
      const range = findMatchRange(line.text, matches[0]);
      return range ? line.color(range, accent) : line;
    },
    tag,
  );

  // ── aliases (alphabetical) ───────────────────────────────────────────────

  // #region alias!
  api.aliases.register(/^alias!$/, () => {
    printHelp();
    return true;
  });

  // #region b* — battle target presets

  // #region b_wsiowe
  api.aliases.register(/^b_wsiowe$/, () => {
    api.command.send('set1 snotlinga');
    api.command.send('set2 goblina');
    api.command.send('set3 orka');
    api.command.send('set4 snotlinga');
    return true;
  });

  // #region bakb
  api.aliases.register(/^bakb$/, () => {
    api.command.send('set1 pierwszego zolnierza');
    api.command.send('set2 drugiego zolnierza');
    api.command.send('set3 zimnookiego zolnierza');
    api.command.send('set4 dowodce');
    return true;
  });

  // #region bbod
  api.aliases.register(/^bbod$/, () => {
    api.command.send('set1 pikiniera');
    api.command.send('set2 zolnierza');
    api.command.send('set3 sierzanta');
    api.command.send('set4 oficera');
    return true;
  });

  // #region bcz
  api.aliases.register(/^bcz$/, () => {
    api.command.send('set czlowieka');
    return true;
  });

  // #region bgb
  api.aliases.register(/^bgb$/, () => {
    api.command.send('set goblinoida');
    return true;
  });

  // #region bgrz
  api.aliases.register(/^bgrz$/, () => {
    api.command.send('set grzyboczleka');
    return true;
  });

  // #region bhas
  api.aliases.register(/^bhas$/, () => {
    api.command.send('set krasnoluda chaosu');
    return true;
  });

  // #region bjas
  api.aliases.register(/^bjas$/, () => {
    api.command.send('set jaszczuroczleka');
    return true;
  });

  // #region bkis
  api.aliases.register(/^bkis$/, () => {
    api.command.send('set kislevite');
    return true;
  });

  // #region bkur
  api.aliases.register(/^bkur$/, () => {
    api.command.send('set nieumarlego');
    api.command.send('set3 barghesta');
    api.command.send('set4 upiora');
    return true;
  });

  // #region bryb
  api.aliases.register(/^bryb$/, () => {
    api.command.send('set ryboczleka');
    return true;
  });

  // #region bstr
  api.aliases.register(/^bstr$/, () => {
    api.command.send('set straznika');
    return true;
  });

  // #region bszcz
  api.aliases.register(/^bszcz$/, () => {
    api.command.send('set szczuroczleka');
    return true;
  });

  // #region bu
  api.aliases.register(/^bu$/, () => {
    api.command.send('set nieumarlego');
    return true;
  });

  // #region bwy
  api.aliases.register(/^bwy$/, () => {
    api.command.send('set wyverne');
    return true;
  });

  // #region bzbo
  api.aliases.register(/^bzbo$/, () => {
    api.command.send('set zboja');
    return true;
  });

  // #region bzol
  api.aliases.register(/^bzol$/, () => {
    api.command.send('set zolnierza');
    return true;
  });

  // #region c [target]
  api.aliases.register(/^c(?:\s+(.+))?$/, (matches) => {
    const arg = matches?.[1]?.trim();
    api.command.send(`zabij ${arg ?? targets[0]}`);
    return true;
  });

  // #region c1 / c2 / c3 / c4
  for (let i = 0; i < 4; i++) {
    const n = i + 1;
    api.aliases.register(new RegExp(`^c${n}$`), () => {
      api.command.send(`c ${targets[i]}`);
      return true;
    });
  }

  // #region la+
  api.aliases.register(/^la\+$/, () => {
    api.command.send('wyj lampe|olej');
    api.command.send('przytrocz lampe');
    api.command.send('naplam');
    api.command.send('/zap');
    return true;
  });

  // #region la-
  api.aliases.register(/^la-$/, () => {
    api.command.send('/zg');
    api.command.send('odtrocz lampe');
    api.command.send('wlz lampe|oleje');
    return true;
  });

  // #region napt
  api.aliases.register(/^napt$/, () => {
    api.command.send('otworz zalozona torbe');
    api.command.send('napelnij zalozona torbe');
    return true;
  });

  // #region ned+
  registerSendAlias(/^ned\+$/, 'ned+', 'ned');

  // #region obb
  api.aliases.register(/^obb$/, () => {
    api.command.send('zajrzyj do zalozonej torby');
    return true;
  });

  // #region op+
  registerSendAlias(/^op\+$/, 'op+', 'op');

  // #region op++
  api.aliases.register(/^op\+\+$/, () => {
    armArrivalTrigger('op++', () => {
      api.command.send('op');
      api.command.send('ned');
    });
    return true;
  });

  // #region ot
  api.aliases.register(/^ot$/, () => {
    api.command.send('otworz zalozona torbe');
    return true;
  });

  // #region pj [text]
  registerTextAlias(/^pj(?:\s+(.+))?$/, 'przejrzyj');

  // #region pr [text]
  registerTextAlias(/^pr(?:\s+(.+))?$/, 'przeczytaj');

  // #region set [target]
  api.aliases.register(/^set(?:\s+(.+))?$/, (matches) => {
    const target = matches?.[1]?.trim();
    if (!target) {
      printTargets();
      return true;
    }
    for (let i = 0; i < 4; i++) {
      targets[i] = `${ORDINALS[i]}${target}`;
    }
    printTargets();
    updateFooter();
    return true;
  });

  // #region set1 / set2 / set3 / set4
  for (let i = 0; i < 4; i++) {
    const n = i + 1;
    api.aliases.register(new RegExp(`^set${n}(?:\\s+(.+))?$`), (matches) => {
      const what = matches?.[1]?.trim();
      if (!what) {
        api.output.print(`[t${n}] ${targets[i]}`);
        return true;
      }
      targets[i] = what;
      api.output.print(`[t${n}] ${targets[i]}`);
      updateFooter();
      return true;
    });
  }

  // #region test-arrival
  api.aliases.register(/^test-arrival$/, () => {
    api.command.send('/fake --> Statek z wolna doplywa do brzegu.');
    return true;
  });

  // #region wlz [what]
  api.aliases.register(/^wlz(?:\s+(.+))?$/, (matches) => {
    const text = matches?.[1]?.trim();
    if (!text) return true;
    for (const item of text
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)) {
      api.command.send(`wloz ${item} do zalozonej torby`);
    }
    return true;
  });

  // #region wned+
  registerSendAlias(/^wned\+$/, 'wned+', 'wned');

  // #region wop+
  registerSendAlias(/^wop\+$/, 'wop+', 'wop');

  // #region wyj [what]
  api.aliases.register(/^wyj(?:\s+(.+))?$/, (matches) => {
    const text = matches?.[1]?.trim();
    if (!text) return true;
    for (const item of text
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)) {
      api.command.send(`wez ${item} z zalozonej torby`);
    }
    return true;
  });

  // #region zt
  api.aliases.register(/^zt$/, () => {
    api.command.send('zamknij zalozona torbe');
    api.command.send('la+');
    return true;
  });

  const info: PluginInfo = {
    name: 'My Aliases',
    version: '0.1.0',
    description: 'Personal aliases for ship and vehicle travel helpers',
  };
  api.output.print(`[${info.name} v${info.version}] loaded`);
  return info;
}
