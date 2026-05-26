import type { PluginApi } from '@arkadia/plugin-types';
import { registerTempTrigger } from './registerTempTrigger';

/**
 * Arms a one-shot trigger: fires commands once when pattern is seen in output,
 * after a short random delay, with an audio cue.
 * Commands are separated by semicolons.
 */
export function makeTemp(api: PluginApi, pattern: string, commands: string): void {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, 'i');
  } catch {
    api.output.print(`[maketemp] invalid pattern: ${pattern}`);
    return;
  }

  registerTempTrigger(api, regex, 400, 627, () => {
    api.command.send('play_tink');
    for (const cmd of commands
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)) {
      api.command.send(cmd);
    }
  });

  api.output.print(`[maketemp]: ${pattern}`);
}
