import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';
import { escapeRegex } from '../../../lib/escapeRegex';
import { registerTokenGate } from '../../../lib/registerTokenGate';

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

  registerTokenGate(
    api,
    ['bezpiecznie', 'rozbieg', 'docierasz', 'zaczynasz', 'wchodzisz', 'odpadasz'],
    [exactPattern, ...REGEX_PATTERNS],
    (line) => applyOK(line),
    TAG,
  );
}
