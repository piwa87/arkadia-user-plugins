import type { PluginApi } from '@arkadia/plugin-types';
import { registerDev } from '../devAlias';

// Q W E R T Y U I O P → team shortcut letters a–j (positions 1–10)
const SLOT_KEYS = ['qq', 'ww', 'ee', 'rr', 'tt', 'yy', 'uu', 'ii', 'oo', 'pp'];

export function setupPartyShieldAliases(api: PluginApi): void {
  SLOT_KEYS.forEach((key, idx) => {
    const letter = String.fromCharCode('a'.charCodeAt(0) + idx);

    // <key> [group] — zaslon member
    registerDev(
      api,
      new RegExp(`^${key}(?:\\s+(\\d+))?$`, 'i'),
      `${key} [group]`,
      (matches) => {
        if (key === 'oo' && api.team.getMembers().length < 9) return 'otul sie plaszczem';
        const group = matches?.[1];
        const level = group && ['2', '3', '4'].includes(group) ? group : null;
        return level ? `/za${level} ${letter}` : `/za ${letter}`;
      },
      (matches) => {
        if (key === 'oo' && api.team.getMembers().length < 9) {
          api.command.send('otul sie plaszczem');
          return true;
        }
        const group = matches?.[1];
        const level = group && ['2', '3', '4'].includes(group) ? group : null;
        api.command.send(level ? `/za${level} ${letter}` : `/za ${letter}`);
        return true;
      },
    );

    // <key>w — wskaz member jako cel obrony
    registerDev(api, new RegExp(`^${key}w$`, 'i'), `${key}w`, `/wz ${letter}`, () => {
      api.command.send(`/wz ${letter}`);
      return true;
    });

    // <key>x — wycofaj za member
    registerDev(api, new RegExp(`^${key}x$`, 'i'), `${key}x`, `/w ${letter}`, () => {
      api.command.send(`/w ${letter}`);
      return true;
    });

    // <key>z — rozkaz all to shield + wskaz + zaslon
    registerDev(api, new RegExp(`^${key}z$`, 'i'), `${key}z`, `/rz ${letter} → /wz ${letter} → /za ${letter}`, () => {
      api.command.send(`/rz ${letter}`);
      api.command.send(`/za ${letter}`);
      return true;
    });
  });
}
