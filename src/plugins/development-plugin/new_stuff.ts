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
    api.triggers.registerOneTime(/Gdzie chcesz usiasc\?/, (line) => {
      const text = line.text;
      const qIdx = text.indexOf('?');
      if (qIdx === -1) return line;

      const optionsPart = text.slice(qIdx + 1).replace(/\?$/, '').trim();
      const options = optionsPart
        .split(/,\s*|\s+czy\s+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => PREPOSITION.test(s));

      if (options.length === 0) return line;

      const chosen = options[Math.floor(Math.random() * options.length)];
      withDelay(400, 1200, () => api.command.send(`usiadz ${chosen}`, false));
      return line;
    }, TAG_SIAD);

    api.command.send('usiadz');
    return true;
  });

  // ── Gate intercept ──────────────────────────────────────────────────────────
  // When the room description shows a closed gate in some direction, arm a
  // one-shot command hook so the next press of that direction sends the gate
  // command instead of walking (the gate command comes from room.userData.gate).

  api.triggers.register(
    /\bzamkniet.*\b(bram\w*|wrot\w*)\b.*\bprowadzac\w+\s+na\s+(polnocny\s+wschod|polnocny\s+zachod|poludniowy\s+wschod|poludniowy\s+zachod|polnoc|poludnie|wschod|zachod|gore|gora|dol)\b/i,
    (line, matches) => {
      const plDir = matches[2]?.trim().replace(/\s+/g, ' ').toLowerCase();
      const dir = PL_TO_DIR[plDir ?? ''];
      const gateCmd = api.map.getRoom()?.userData?.['gate'];
      if (!dir || !gateCmd) return line;

      const ref = { id: '' };
      ref.id = api.commandHooks.register((cmd: string) => {
        if (cmd === dir) {
          api.commandHooks.unregister(ref.id);
          return gateCmd;
        }
        return undefined;
      });

      return line;
    },
    TAG_GATE,
  );
}
