import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';

const MESSAGES = [
  'Bezpiecznie schodzisz na dol',
  'Bierzesz rozbieg i przeskakujesz wyrwe',
  'Docierasz na gore',
];

const TAG = 'colActions';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function setupColActions(api: PluginApi): void {
  const pattern = new RegExp('^(?:' + MESSAGES.map(escapeRegex).join('|') + ')\\.$');
  const blue = getAnsiFormatState(34, api);

  api.triggers.register(
    pattern,
    (line) => {
      const prefix = new api.AnsiAwareBuffer();
      prefix.append('   OK   ', blue);
      prefix.append(' ');
      return line.prependBuffer(prefix);
    },
    TAG,
  );
}
