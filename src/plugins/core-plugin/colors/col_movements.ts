import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';
import { escapeRegex } from '../../../lib/escapeRegex';
import { registerTokenGate } from '../../../lib/registerTokenGate';

// #region Mountain movement

const OK_MESSAGES = [
  'Bezpiecznie schodzisz na dol',
  'Bierzesz rozbieg i przeskakujesz wyrwe',
  'Docierasz na gore',
];

const WAIT_MESSAGES = [
  'Zaczynasz schodzic na dol',
];

const WAIT_PATTERNS: RegExp[] = [
  /zaczynasz wspinac sie/i,
  /wchodzisz powoli do gory/,
];

const BAD_PATTERNS: RegExp[] = [
  /Odpadasz od \S+ i lecisz w dol/,
];

// #endregion

const TAG = 'colMovements';


export function setupColMovements(api: PluginApi): void {
  const okPattern = new RegExp('^(?:' + OK_MESSAGES.map(escapeRegex).join('|') + ')\\.$');
  const waitPattern = new RegExp('^(?:' + WAIT_MESSAGES.map(escapeRegex).join('|') + ')\\.$');
  const okPrefixColor = getAnsiFormatState(34, api);
  const waitPrefixColor = getAnsiFormatState(37, api);
  const badPrefixColor = getAnsiFormatState(38, api);
  const lineColor = getMyColor(3, api);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyStatus = (
    line: any,
    label: string,
    prefixColor: ReturnType<typeof getMyColor>,
  ) => {
    line.color([0, line.text.length], lineColor);
    const prefix = new api.AnsiAwareBuffer();
    prefix.append(`   ${label}   `, prefixColor);
    prefix.append(' ', lineColor);
    return line.prependBuffer(prefix);
  };

  registerTokenGate(
    api,
    ['bezpiecznie', 'rozbieg', 'docierasz'],
    okPattern,
    (line) => applyStatus(line, 'OK', okPrefixColor),
    TAG,
  );

  registerTokenGate(
    api,
    ['zaczynasz', 'wchodzisz'],
    [waitPattern, ...WAIT_PATTERNS],
    (line) => applyStatus(line, '...', waitPrefixColor),
    TAG,
  );

  registerTokenGate(
    api,
    'odpadasz',
    BAD_PATTERNS,
    (line) => applyStatus(line, 'ZLE', badPrefixColor),
    TAG,
  );
}
