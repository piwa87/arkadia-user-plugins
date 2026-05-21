import type { PluginApi } from '@arkadia/plugin-types';
import { col0, col5 } from '../../../lib/colors/my-colors';

export interface ZmeczenieState {
  aktZm: number; // 0-9 (0=calkowicie wycienczon, 9=w pelni wypoczet)
}

export function createZmeczenieState(): ZmeczenieState {
  return { aktZm: 8 };
}

// worst → best; array index = akt_zm value
const POZ_ZM = [
  'calkowicie wycienczon',
  'wycienczon',
  'bardzo wyczerpan',
  'wyczerpan',
  'nieco wyczerpan',
  'bardzo zmeczon',
  'zmeczon',
  'troche zmeczon',
  'wypoczet',
  'w pelni wypoczet',
] as const;

// Recovery time estimate per level (null = fully rested, no display)
const CZAS_ZM: ReadonlyArray<string | null> = [
  '4 min',    // 0
  '4 min',    // 1
  '3,5 min',  // 2
  '3 min',    // 3
  '2,5 min',  // 4
  '2 min',    // 5
  '90 sek',   // 6
  '60 sek',   // 7
  '30 sek',   // 8
  null,        // 9
];

const POZ_PATTERN = POZ_ZM.join('|');

export function setupZmeczenieTriggers(api: PluginApi, state: ZmeczenieState): void {
  const tag = 'zmeczenie';
  const colAmber = api.colors.fromHex(col5);
  const colGray = api.colors.fromHex(col0);

  // "Jestes/jestes <stan>[y|a]." — main fatigue line
  api.triggers.register(
    new RegExp(`^(Jestes|jestes) (${POZ_PATTERN})(y|a)\\.$`),
    (line, matches) => {
      if (!matches) return line;
      const [, prefix, stanBase, suffix] = matches;
      const idx = POZ_ZM.indexOf(stanBase as (typeof POZ_ZM)[number]);
      state.aktZm = idx;

      const color = idx <= 4 ? colAmber : colGray;
      const czas = CZAS_ZM[idx];

      const buf = new api.AnsiAwareBuffer();
      buf.append(`${prefix} `, colGray);
      buf.append(`${stanBase}${suffix}`, color);
      buf.append(` [${idx}/9]`);
      if (czas !== null) buf.append(` [${czas}]`);
      return buf;
    },
    tag,
  );

  // "Czujesz sie <stan>[y|a]." — compact status line (e.g. from 'zmeczenie' command)
  api.triggers.register(
    new RegExp(`^Czujesz sie (${POZ_PATTERN})(y|a)\\.$`),
    (line, matches) => {
      if (!matches) return line;
      const [, stanBase, suffix] = matches;
      const idx = POZ_ZM.indexOf(stanBase as (typeof POZ_ZM)[number]);
      state.aktZm = idx;

      const color = idx <= 4 ? colAmber : colGray;
      const fullText = stanBase + suffix;
      const pad = ' '.repeat(Math.max(0, 20 - fullText.length));

      const buf = new api.AnsiAwareBuffer();
      buf.append('          [', colGray);
      buf.append(pad + fullText, color);
      buf.append(']', colGray);
      return buf;
    },
    tag,
  );
}
