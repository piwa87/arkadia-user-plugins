import type { PluginApi } from '@arkadia/plugin-types';
import { notify } from '../../../lib/notifications';
import { registerTokenGate } from '../../../lib/registerTokenGate';

const TAG = 'dylizansy';

export function setupDylizansy(api: PluginApi): void {
  registerTokenGate(
    api,
    'zewnatrz',
    /^Z zewnatrz slyszysz glos woznicy: <([^<>]+)>$/,
    (line, matches) => {
      notify(`🚏 Przystanek: ${matches[1].trim()}`);
      return line;
    },
    TAG,
  );
}
