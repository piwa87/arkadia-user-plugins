import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';

// #region Mountain movement

const EXACT_MESSAGES = [
  'Bezpiecznie schodzisz na dol',
  'Bierzesz rozbieg i przeskakujesz wyrwe',
  'Docierasz na gore',
  'Zaczynasz schodzic na dol',
];

const REGEX_PATTERNS: RegExp[] = [
  /zaczynasz wspinac sie/i,
  /wchodzisz powoli do gory/,
  /Odpadasz od \S+ i lecisz w dol/,
];

// #endregion

const TAG = 'colMovements';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function setupColMovements(api: PluginApi): void {
  const exactPattern = new RegExp('^(?:' + EXACT_MESSAGES.map(escapeRegex).join('|') + ')\\.$');
  const blue = getAnsiFormatState(34, api);
  const col3 = getMyColor(3, api);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyOK = (line: any) => {
    line.color([0, line.text.length], col3);
    const prefix = new api.AnsiAwareBuffer();
    prefix.append('   OK   ', blue);
    prefix.append(' ', col3);
    return line.prependBuffer(prefix);
  };

  api.triggers.register(exactPattern, (line) => applyOK(line), TAG);

  for (const pattern of REGEX_PATTERNS) {
    api.triggers.register(pattern, (line) => applyOK(line), TAG);
  }
}
