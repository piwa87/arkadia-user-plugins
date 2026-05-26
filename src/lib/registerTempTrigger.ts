import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from './withDelay';

export function registerTempTrigger(
  api: PluginApi,
  pattern: RegExp,
  minDelay: number,
  maxDelay: number,
  callback: () => void,
  tag?: string,
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
