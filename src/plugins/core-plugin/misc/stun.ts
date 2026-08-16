import type { PluginApi } from '@arkadia/plugin-types';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';

const TAG = 'stun';

/**
 * Stun recovery trigger: sends stunoff and shows THE POWER IS BACK banner
 * when the character recovers from a stun.
 */
export function setupStun(api: PluginApi): void {
  registerTokenGate(
    api,
    'dochodzisz',
    /^Powoli dochodzisz do siebie\.$/i,
    () => {
      const cyan = getAnsiFormatState(36, api);
      const banner = [
        '                               ',
        '      THE POWER IS BACK        ',
        '                               ',
      ];
      api.output.print('');
      for (const line of banner) {
        const buf = new api.AnsiAwareBuffer(line);
        buf.color([0, line.length], cyan);
        api.output.print(buf);
      }
      api.output.print('');

      return null; // suppress the original line
    },
    TAG,
  );
}