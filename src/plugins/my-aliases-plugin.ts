import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { findMatchRange } from '../lib/findMatchRange';

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

  const registerTextAlias = (pattern: RegExp, command: string) => {
    api.aliases.register(pattern, (matches) => {
      const text = matches?.[1]?.trim();
      api.command.send(text ? `${command} ${text}` : command);
      return true;
    });
  };

  const printHelp = () => {
    const cmdColor = api.colors.fromHex('#7dd3fc');
    const borderColor = api.colors.fromHex('#4b5563');

    const entries: [string, string][] = [
      ['alias!', 'show this help'],
      ['la+', 'lamp on sequence'],
      ['la-', 'lamp off sequence'],
      ['ned+', 'arrival trigger, send: ned'],
      ['op+', 'arrival trigger, send: op'],
      ['op++', 'arrival trigger, send: op + ned'],
      ['pj <text>', 'przejrzyj <text>'],
      ['pr <text>', 'przeczytaj <text>'],
      ['test-arrival', 'simulate ship arrival line'],
      ['wned+', 'arrival trigger, send: wned'],
      ['wop+', 'arrival trigger, send: wop'],
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

  api.aliases.register(/^\/?alias!$/, () => {
    printHelp();
    return true;
  });

  api.aliases.register(/^\/?la\+$/, () => {
    api.command.send('wyj lampe');
    api.command.send('przytrocz lampe');
    api.command.send('wyj olej');
    api.command.send('/zap');
    return true;
  });

  api.aliases.register(/^\/?la-$/, () => {
    api.command.send('/zg');
    api.command.send('odtrocz lampe');
    api.command.send('wlz lampe');
    api.command.send('wlz oleje');
    return true;
  });

  registerSendAlias(/^\/?ned\+$/, 'ned+', 'ned');
  registerSendAlias(/^\/?op\+$/, 'op+', 'op');

  api.aliases.register(/^\/?op\+\+$/, () => {
    armArrivalTrigger('op++', () => {
      api.command.send('op');
      api.command.send('ned');
    });
    return true;
  });

  registerTextAlias(/^\/?pj(?:\s+(.+))?$/, 'przejrzyj');
  registerTextAlias(/^\/?pr(?:\s+(.+))?$/, 'przeczytaj');

  api.aliases.register(/^\/?test-arrival$/, () => {
    api.command.send('/fake --> Statek z wolna doplywa do brzegu.');
    return true;
  });

  registerSendAlias(/^\/?wned\+$/, 'wned+', 'wned');
  registerSendAlias(/^\/?wop\+$/, 'wop+', 'wop');

  return {
    name: 'My Aliases',
    version: '0.1.0',
    description: 'Personal aliases for ship and vehicle travel helpers',
  };
}
