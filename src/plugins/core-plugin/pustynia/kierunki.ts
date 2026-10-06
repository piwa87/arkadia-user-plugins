import type { PluginApi } from '@arkadia/plugin-types';
import { POLISH_COMPASS_DIRECTIONS } from '../../../lib/directions';
import { getMyColor } from '../../../lib/colors/my-colors';
import { registerTokenGate } from '../../../lib/registerTokenGate';

const TAG = 'pustyniaKierunki';
const direction = `(?:${Object.keys(POLISH_COMPASS_DIRECTIONS).join('|')})`;
const directionList = `${direction}(?:(?:,\\s*(?:(?:i|oraz)\\s+)?|\\s+(?:i|oraz)\\s+)(?:na\\s+)?${direction})*`;
const LANDMARK_LABELS: Record<string, string> = {
  'szeroka rozpadlina': 'ROZPADLINA',
  'mury wielkiego miasta': 'MURY',
  'masyw gorski': 'MASYW',
};
const landmark = `(${Object.keys(LANDMARK_LABELS).join('|')})`;
const clause = `${landmark}\\s+(?:zagradza(?:ja)?\\s+droge\\s+na|czyni\\s+niemozliwa\\s+podroz\\s+na|-(?:\\s+na)?)\\s+(${directionList})`;
const pattern = new RegExp(`^${clause},?\\s+(?:a|i|zas|natomiast)\\s+${clause}\\.$`, 'i');
const directionPattern = new RegExp(direction, 'gi');
const wallsPattern = new RegExp(`^Mury miejskie nie pozwalaja ci isc na (${directionList})\\.$`, 'i');
const mountainPattern = new RegExp(`^Podroz na (${directionList}) uniemozliwia nieprzebyty masyw gorski\\.$`, 'i');
const riftPattern = new RegExp(
  `^Szeroka rozpadlina rozciaga sie po pustyni, czyniac podroz na (${directionList}) niemozliwa\\.$`,
  'i',
);

export function setupPustyniaKierunki(api: PluginApi): void {
  const labelColor = getMyColor(3, api);
  const directionColor = getMyColor(4, api);
  const separatorColor = getMyColor(3, api);
  const abbreviate = (text: string) =>
    (text.match(directionPattern) ?? [])
      .map((word) => POLISH_COMPASS_DIRECTIONS[word.toLowerCase()].toUpperCase())
      .join(', ');

  for (const [token, singlePattern, label] of [
    ['mury', wallsPattern, 'MURY'],
    ['rozpadlina', riftPattern, 'ROZPADLINA'],
    ['masyw', mountainPattern, 'MASYW'],
  ] as const) {
    registerTokenGate(
      api,
      token,
      singlePattern,
      (line, matches) => {
        if (!matches?.[1]) return line;
        const result = new api.AnsiAwareBuffer();
        result.append(`[${label}]: `, labelColor);
        result.append(abbreviate(matches[1]), directionColor);
        return result;
      },
      TAG,
    );
  }

  registerTokenGate(
    api,
    ['rozpadlina', 'masyw'],
    pattern,
    (line, matches) => {
      if (!matches || matches[1].toLowerCase() === matches[3].toLowerCase()) return line;

      const directions = new Map([
        [matches[1].toLowerCase(), matches[2]],
        [matches[3].toLowerCase(), matches[4]],
      ]);

      const result = new api.AnsiAwareBuffer();
      for (const [name, label] of Object.entries(LANDMARK_LABELS)) {
        const text = directions.get(name);
        if (!text) continue;
        if (result.text.length > 0) result.append('   +   ', separatorColor);
        result.append(`[${label}]: `, labelColor);
        result.append(abbreviate(text), directionColor);
      }
      return result;
    },
    TAG,
  );
}
