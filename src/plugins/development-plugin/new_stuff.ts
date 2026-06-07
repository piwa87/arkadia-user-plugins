import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from '../../lib/withDelay';

const TAG_SIAD = 'dev_siad_oneshot';
const TAG_GATE = 'dev_gate_intercept';

const PREPOSITION = /^(przy|na|za|w|przed|po|obok|pod|kolo|wokol|miedzy|nad)\b/i;

const PL_TO_DIR: Record<string, string> = {
  'polnocny wschod': 'ne',
  'polnocny zachod': 'nw',
  'poludniowy wschod': 'se',
  'poludniowy zachod': 'sw',
  polnoc: 'n',
  poludnie: 's',
  wschod: 'e',
  zachod: 'w',
  gore: 'u',
  gora: 'u',
  dol: 'd',
};

export function setupNewStuffAliases(api: PluginApi): void {
  // ── Siad ────────────────────────────────────────────────────────────────────

  api.aliases.register(/^siad$/i, () => {
    api.triggers.removeByTag(TAG_SIAD);
    api.triggers.registerOneTime(
      /Gdzie chcesz usiasc\?/,
      (line) => {
        const text = line.text;
        const qIdx = text.indexOf('?');
        if (qIdx === -1) return line;

        const optionsPart = text
          .slice(qIdx + 1)
          .replace(/\?$/, '')
          .trim();
        const options = optionsPart
          .split(/,\s*|\s+czy\s+/)
          .map((s) => s.trim().toLowerCase())
          .filter((s) => PREPOSITION.test(s));

        if (options.length === 0) return line;

        const chosen = options[Math.floor(Math.random() * options.length)];
        withDelay(400, 1200, () => api.command.send(`usiadz ${chosen}`, false));
        return line;
      },
      TAG_SIAD,
    );

    api.command.send('usiadz');
    return true;
  });

  // ── Multibind shortcuts ─────────────────────────────────────────────────────
  let currentBinds: { index: number; action: string }[] = [];

  const onMultibinds = ({ list }: { list: { index: number; action: string; label: string }[] }) => {
    currentBinds = list;
  };
  api.events.on('multibinds', onMultibinds);

  const runBind = (index: number) => {
    const entry = currentBinds.find((b) => b.index === index);
    if (!entry) {
      api.command.send('sig nic');
      // api.output.print(`Brak multibinda ${index} dla tej lokacji.`);
      return;
    }
    api.command.send(entry.action);
  };

  api.aliases.register(/^doo([2-4])?$/i, (matches) => {
    const index = matches?.[1] ? parseInt(matches[1], 10) : 1;
    runBind(index);
    return true;
  });

  api.aliases.register(/^doo\+\s+(.+)$/i, (matches) => {
    api.command.send(`/mbind 1 ${matches![1]}`, true);
    return true;
  });

  api.aliases.register(/^doo-$/i, () => {
    api.command.send('/mbind- 1', false);
    return true;
  });

  // ── Gate intercept (v3 — direction-specific, replace with gate command once) ─
  // When the room description shows a closed gate leading in a specific
  // direction and the current room carries a gate command (userData.gate), arm
  // a one-shot command hook on THAT direction: the next press of it sends the
  // gate command instead of walking. The hook removes itself after firing, so
  // movement in that direction then works normally (through the open gate).
  //
  // The hook is only valid in the room where the gate line was seen, so we also
  // arm a one-shot mapMove listener: if the player leaves that room without
  // using the gate, mapMove fires first and disarms the hook — preventing a
  // stale hook from hijacking the same direction in a different room.

  api.triggers.register(
    /\bzamkniet.*\b(bram\w*|wrot\w*)\b.*\bprowadzac\w+\s+na\s+(polnocny[\s-]+wschod|polnocny[\s-]+zachod|poludniowy[\s-]+wschod|poludniowy[\s-]+zachod|polnoc|poludnie|wschod|zachod|gore|gora|dol)\b/i,
    (line, matches) => {
      const plDir = matches?.[2]?.trim().replace(/[\s-]+/g, ' ').toLowerCase();
      const dir = PL_TO_DIR[plDir ?? ''];
      const gateCmd = api.map.getRoom()?.userData?.['gate'];
      if (!dir || !gateCmd) return line;

      const ref = { id: '' };

      const disarm = () => {
        api.commandHooks.unregister(ref.id);
        api.events.off('mapMove', disarm);
      };

      ref.id = api.commandHooks.register((cmd: string) => {
        if (cmd === dir) {
          disarm();
          return gateCmd;
        }
        return undefined;
      });

      // Leaving the room before using the gate cancels the armed hook.
      api.events.on('mapMove', disarm);

      return line;
    },
    TAG_GATE,
  );
}
