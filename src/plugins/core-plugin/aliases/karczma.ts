import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from '../../../lib/withDelay';

const TAG_SIAD = 'siad_oneshot';

const PREPOSITION = /^(przy|na|za|w|przed|po|obok|pod|kolo|wokol|miedzy|nad)\b/i;

export function setupKarczmaAliases(api: PluginApi): void {
  // ── Siad ────────────────────────────────────────────────────────────────────
  // `siad` sits down, picking a random spot from the game's "Gdzie chcesz
  // usiasc?" prompt (one-shot trigger), then sends `usiadz <spot>` after a
  // short randomized delay.

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
}
