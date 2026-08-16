import type { PluginApi } from '@arkadia/plugin-types';
import { findMatchRange } from '../../../lib/findMatchRange';
import { getMyColor } from '../../../lib/colors/my-colors';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { TEMP_TRIGGER_TAG } from '../../../lib/registerTempTrigger';

/**
 * szuk! <pattern> - one-shot search: highlights the match and shows a visual alert
 */
export function setupSzukAlias(api: PluginApi): void {
  const matchColor = getAnsiFormatState(115, api);
  const artColor = getMyColor(3, api);
  const artLines = ['                  ooo       ', '                ooooooo     ', '                  ooo       '];

  api.aliases.register(/^szuk!\s+(.+)$/, (matches) => {
    const pattern = matches![1].trim();

    let regex: RegExp;
    try {
      regex = new RegExp(pattern, 'i');
    } catch {
      api.output.print(`[szuk!] invalid pattern: ${pattern}`);
      return true;
    }

    api.output.print(`--> Szukam: ${pattern}`);

    api.triggers.registerOneTime(
      regex,
      (line, triggerMatches) => {
        const range = findMatchRange(line.text, triggerMatches?.[0] ?? '');
        if (range) line.color(range, matchColor);

        api.command.send('play_tink');

        api.output.print('');
        for (const artLine of artLines) {
          const buf = new api.AnsiAwareBuffer(artLine);
          buf.color([0, artLine.length], artColor);
          api.output.print(buf);
        }
        api.output.print('');

        return line;
      },
      TEMP_TRIGGER_TAG,
    );

    return true;
  });
}
