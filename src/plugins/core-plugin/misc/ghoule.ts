import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from '../../../lib/withDelay';
import { getMyColor } from '../../../lib/colors/my-colors';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { findMatchRange } from '../../../lib/findMatchRange';
import { registerTokenGate } from '../../../lib/registerTokenGate';

const TAG = 'ghoule';

// Direction mapping: Polish long names / ASCII-safe variants → short commands
const dirLongToShort: Record<string, string> = {
  północ: 'n',
  polnoc: 'n',
  południe: 's',
  poludnie: 's',
  wschód: 'e',
  wschod: 'e',
  zachód: 'w',
  zachod: 'w',
  'północny wschód': 'ne',
  'polnocny wschod': 'ne',
  'północny zachód': 'nw',
  'polnocny zachod': 'nw',
  'południowy wschód': 'se',
  'poludniowy wschod': 'se',
  'południowy zachód': 'sw',
  'poludniowy zachod': 'sw',
  góra: 'u',
  gora: 'u',
  dół: 'd',
  dol: 'd',
};

let ghoulEnabled = false;
let ghoulHunting = false;
let ghoulSpotted = false;

/**
 * Ghoule hunting module.
 *
 * Aliases:
 *   gh+   – master switch: enable ghoule module (triggers become active)
 *   gh-   – master switch: disable ghoule module (all hunting stops)
 *   gh!   – arm the hunt: activates ghoul spotting & flee tracking
 *
 * When hunting:
 *   - gh_szuk fires when a "ghoul" appears in output (one-shot per gh!)
 *   - gh_ucieka follows if the ghoul flees to an adjacent room
 *   - Death message disarms the hunt automatically
 */
export function setupGhoule(api: PluginApi): () => void {
  // --- Master switch: gh+ / gh- ---

  api.aliases.register(/^gh\+$/, () => {
    ghoulEnabled = true;
    api.output.print('[ghoule] module enabled');
    return true;
  });

  api.aliases.register(/^gh-$/, () => {
    ghoulEnabled = false;
    ghoulHunting = false;
    ghoulSpotted = false;
    api.output.print('[ghoule] module disabled');
    return true;
  });

  // --- Hunt arming: gh! ---

  api.aliases.register(/^gh!$/, () => {
    if (!ghoulEnabled) {
      api.output.print('[ghoule] module is disabled — use gh+ first');
      return true;
    }
    ghoulHunting = true;
    ghoulSpotted = false;
    api.command.send('sig Dawaj nastepnego ghoula!');
    return true;
  });

  // --- gh_szuk: one-shot visual alert when ghoul is spotted ---

  registerTokenGate(
    api,
    'ghoul',
    /\bghoul\b/i,
    (line, matches) => {
      if (!ghoulHunting || ghoulSpotted) return line;
      ghoulSpotted = true;

      const matchColor = getAnsiFormatState(115, api);
      const range = findMatchRange(line.text, matches[0]);
      if (range) line.color(range, matchColor);

      api.command.send('play_tink');

      const artColor = getMyColor(3, api);
      api.output.print('');
      const buf = new api.AnsiAwareBuffer('     GHOUL     ');
      buf.color([0, 15], artColor);
      api.output.print(buf);
      api.output.print('');

      return line;
    },
    TAG,
  );

  // --- gh_ucieka: follow fleeing ghoul ---

  registerTokenGate(
    api,
    'ghoul',
    /^.* ghoul w panice umyka na (.*)\./i,
    (line, matches) => {
      if (!ghoulHunting) return line;

      const dir = matches?.[1]?.trim().toLowerCase() ?? '';
      const short = dirLongToShort[dir] ?? dir;
      withDelay(250, 600, () => api.command.send(short));

      return line;
    },
    TAG,
  );

  // --- Death trigger: ghoul falls dead → disarm hunt ---

  registerTokenGate(
    api,
    'ghoul',
    /^.* ghoul z gluchym jekiem pada bezwladnie na ziemie\./i,
    (line) => {
      ghoulHunting = false;
      ghoulSpotted = false;
      return line;
    },
    TAG,
  );

  // Return cleanup function
  return () => {
    ghoulEnabled = false;
    ghoulHunting = false;
    ghoulSpotted = false;
    api.triggers.removeByTag(TAG);
  };
}
