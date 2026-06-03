import type { PluginApi } from '@arkadia/plugin-types';
import { getMyColor } from '../../../lib/colors/my-colors';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';

const RANY = [
  'ledwo muska',
  'lekko rani',
  'rani',
  'powaznie rani',
  'bardzo ciezko rani',
  'masakruje',
] as const;

// Longest alternatives first to avoid partial matches on shared prefixes
const RANY_ALT = 'ledwo muska|lekko rani|powaznie rani|bardzo ciezko rani|masakruje|rani';

export function setupCiosyKolory(api: PluginApi): void {
  const tag = 'ciosyKolory';

  // Hits from others (koloryR): gray, green, orange, red, red, white-on-darkgray
  const koloryR = [
    getMyColor(0, api),
    getMyColor(4, api),
    getMyColor(5, api),
    getMyColor(6, api),
    getMyColor(6, api),
    getAnsiFormatState(47, api),
  ];

  // My hits (koloryR2): light-gray, light-gray, light-gray, red, red, red
  const koloryR2 = [
    getMyColor(3, api),
    getMyColor(3, api),
    getMyColor(3, api),
    getMyColor(6, api),
    getMyColor(6, api),
    getMyColor(6, api),
  ];

  // ciosy_moje: my hits — color the full conjugated verb including "sz" (ranisz, muskasz, masakrujesz)
  api.triggers.register(
    new RegExp(`\\b(${RANY_ALT})sz\\b`, 'i'),
    (line, matches) => {
      const key = matches[1].toLowerCase();
      const idx = (RANY as readonly string[]).indexOf(key);
      if (idx === -1) return line;
      const full = matches[0].toLowerCase(); // e.g. "ledwo muskasz"
      const start = line.text.toLowerCase().indexOf(full);
      if (start !== -1) line.color([start, start + full.length], koloryR2[idx]);
      return line;
    },
    tag,
  );

  // ciosy_innych: hits from/at others — color severity word and "cie" when present
  api.triggers.register(
    new RegExp(`\\b(${RANY_ALT})(?!sz)\\b`, 'i'),
    (line, matches) => {
      const key = matches[1].toLowerCase();
      const idx = (RANY as readonly string[]).indexOf(key);
      if (idx === -1) return line;
      const textLower = line.text.toLowerCase();
      const start = textLower.indexOf(key);
      if (start === -1) return line;
      const withCie = key + ' cie';
      const end = textLower.startsWith(withCie, start) ? start + withCie.length : start + key.length;
      line.color([start, end], koloryR[idx]);
      return line;
    },
    tag,
  );
}
