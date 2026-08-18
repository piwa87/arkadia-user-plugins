import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from '../../lib/withDelay';

const TAG_SIAD = 'siad_oneshot';

const PREPOSITION = /^(przy|na|za|w|przed|po|obok|pod|kolo|wokol|miedzy|nad)\b/i;

/**
 * Trigger the "Gdzie chcesz usiasc?" prompt and pick a random available spot.
 * Shared between `siad` and `karcz` aliases.
 */
function triggerSiadPrompt(api: PluginApi): void {
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
}

export function setupKarczmaAliases(api: PluginApi): void {
  // ── Siad ────────────────────────────────────────────────────────────────────
  // `siad` sits down, picking a random spot from the game's "Gdzie chcesz
  // usiasc?" prompt (one-shot trigger), then sends `usiadz <spot>` after a
  // short randomized delay.

  api.aliases.register(/^siad$/i, () => {
    triggerSiadPrompt(api);
    return true;
  });

  // ── Karcz ───────────────────────────────────────────────────────────────────
  // `karcz` — sit, look around, sit at a random spot, open the menu.
  api.aliases.register(/^karcz$/i, () => {
    api.command.send('usiadz');
    api.command.send('rozejrzyj sie z namyslem');
    withDelay(367, 867, () => {
      triggerSiadPrompt(api);
      api.command.send('smmenu');
      api.command.send('otm');
    });
    return true;
  });
}