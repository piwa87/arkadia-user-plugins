import type { PluginApi } from '@arkadia/plugin-types';
import { col5 } from '../../lib/colors/my-colors';

export function megaphone(api: PluginApi, text: string): void {
  const input = text.toUpperCase();
  let output = '    ';
  for (const char of input) {
    output += char + (char === ' ' ? '   ' : ' ');
  }
  output += '    !!!';
  const c = api.colors.fromHex(col5);
  api.output.print('');
  const buf = new api.AnsiAwareBuffer(output);
  buf.color([0, buf.length], c);
  api.output.print(buf);
  api.output.print('');
}

export function setupMgfnAlias(api: PluginApi): void {
  api.aliases.register(/^mgfn\s+(.+)$/, (matches) => {
    if (!matches) return true;
    megaphone(api, matches[1]);
    return true;
  });
}
