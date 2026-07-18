import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from './withDelay';

// Default tag so armed-but-never-matched one-shot triggers stay removable:
// the client's cleanup() does NOT auto-remove triggers, so core-plugin's
// destroy() removes this tag explicitly.
export const TEMP_TRIGGER_TAG = 'tempTriggers';

export function registerTempTrigger(
  api: PluginApi,
  pattern: RegExp,
  minDelay: number,
  maxDelay: number,
  callback: () => void,
  tag: string = TEMP_TRIGGER_TAG,
): void {
  api.triggers.registerOneTime(
    pattern,
    (line) => {
      withDelay(minDelay, maxDelay, callback);
      return line;
    },
    tag,
  );
}
