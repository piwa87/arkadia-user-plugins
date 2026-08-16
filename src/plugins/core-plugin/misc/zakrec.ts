import type { PluginApi } from '@arkadia/plugin-types';
import { getMyColor } from '../../../lib/colors/my-colors';

/**
 * zakrec! - spin the wheel: prints a suspenseful sequence then reveals a random result
 */
export function setupZakrecAlias(api: PluginApi): void {
  api.aliases.register(/^zakrec!$/, () => {
    const items = ['exp', 'idl', 'spac', 'piwo', 'pk', 'klucze'];
    const steps: [string, number][] = [
      ['Krece korba!!!', 2000],
      ['Kreci..', 2000],
      ['Kreci......', 3000],
      ['Ciagle kreci.....', 4000],
    ];
    let offset = 0;
    for (const [msg, wait] of steps) {
      setTimeout(() => api.output.print(msg), offset);
      offset += wait;
    }
    setTimeout(() => {
      const result = items[Math.floor(Math.random() * items.length)].toUpperCase();
      const spaced = result.split('').join(' ');

      const innerWidth = 28;
      const center = (s: string) => {
        const pad = innerWidth - s.length;
        return ' '.repeat(Math.floor(pad / 2)) + s + ' '.repeat(Math.ceil(pad / 2));
      };

      const bar = '═'.repeat(innerWidth);
      const resultColor = getMyColor(13, api);
      const borderColor = getMyColor(14, api);

      const rows: [string, ReturnType<typeof getMyColor>][] = [
        [`╔${bar}╗`, borderColor],
        [`║${center('W Y N I K :')}║`, borderColor],
        [`║${center(spaced)}║`, resultColor],
        [`╚${bar}╝`, borderColor],
      ];

      api.output.print('');
      for (const [text, color] of rows) {
        const buf = new api.AnsiAwareBuffer(text);
        buf.color([0, text.length], color);
        api.output.print(buf);
      }
      api.output.print('');
    }, offset);
    return true;
  });
}
