import type { PluginApi } from '@arkadia/plugin-types';

/**
 * Print a blank line, `lines` copies of `text` colored with the hex `color`,
 * and a closing blank line.
 */
export function printBanner(api: PluginApi, text: string, color: string, lines = 3): void {
  const c = api.colors.fromHex(color);
  api.output.print('');
  for (let i = 0; i < lines; i++) {
    const buf = new api.AnsiAwareBuffer(text);
    buf.color([0, text.length], c);
    api.output.print(buf);
  }
  api.output.print('');
}
