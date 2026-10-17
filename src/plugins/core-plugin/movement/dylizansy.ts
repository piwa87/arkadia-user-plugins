import type { PluginApi } from '@arkadia/plugin-types';
import { notify } from '../../../lib/notifications';
import { registerTokenGate } from '../../../lib/registerTokenGate';

const TAG = 'dylizansy';

export function setupDylizansy(api: PluginApi): void {
  registerTokenGate(
    api,
    ['zewnatrz', 'oznajmia'],
    [
      /^Z zewnatrz slyszysz glos woznicy: (?:Fermata|Przystanek)\s*-\s*(\S.*)$/i,
      /^Z zewnatrz dochodzi stlumiony glos woznicy: Postoj,\s*(\S.*)$/i,
      /^Woznica oznajmia glosno: Postoj,\s*(\S.*)$/i,
    ],
    (line, matches) => {
      const stop = matches[1].trim();
      notify(`🚏 ${stop.charAt(0).toUpperCase()}${stop.slice(1)}`);
      return line;
    },
    TAG,
  );
}
