import type { PluginApi } from '@arkadia/plugin-types';
import { createColorWithBackground } from '../../../lib/colors/my-colors';

export function setupMiscTriggers(api: PluginApi): void {
  const tag = 'miscTriggers';

  const col5bg2 = createColorWithBackground(5, 2, api);

  // col_podawania: Alert when someone hands you an item (not reflexive "sie")
  api.triggers.register(
    /^.* daje ci ([a-z]+\s).*.$/,
    (line, matches) => {
      if (matches[1] === 'sie ') return line;
      const pad = '   '.repeat(17);
      const msg = `${pad}KTOS COS CI PODAL${pad}`;
      const buf = new api.AnsiAwareBuffer(msg);
      buf.color([0, msg.length], col5bg2);
      api.output.print(buf);
      return line;
    },
    tag,
  );

  // dobywanie: Weapon draw — replace with spaced-out format, no color
  api.triggers.register(
    /^(.*) dobywa (.*)\.$/,
    (line, matches) => {
      const newText = `${matches[1]}    d o b y w a    ${matches[2]}.`;
      line.replace([0, line.text.length], newText);
      return line;
    },
    tag,
  );

  // juz_dobyte: "Already drawn" message — replace with compact styled notice
  api.triggers.register(
    /^Przeciez.*juz dobyt\w+\.$/,
    (line) => {
      const msg = '       bronie dobyte          ';
      line.replace([0, line.text.length], msg);
      line.color([0, msg.length], col5bg2);
      return line;
    },
    tag,
  );
}
