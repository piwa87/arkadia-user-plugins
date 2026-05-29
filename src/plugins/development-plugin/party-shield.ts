import type { PluginApi } from '@arkadia/plugin-types';
import { registerDev } from './devAlias';

// Double-letter keys → party member positions 1–19
const SLOT_KEYS = [
  'qq', 'ww', 'ee', 'rr', 'tt', 'yy', 'uu', 'ii', 'oo', 'pp',
  'aa', 'ss', 'dd', 'ff', 'gg', 'hh', 'jj', 'kk', 'll',
];

export function setupPartyShieldAliases(api: PluginApi): void {
  SLOT_KEYS.forEach((key, idx) => {
    const pos = idx + 1;

    // <key> → zaslon team member at position pos
    registerDev(
      api,
      new RegExp(`^${key}$`, 'i'),
      key,
      () => {
        const name = api.team.getMembers()[idx];
        return name ? `zasłoń drużyna[${pos}]: ${name}` : `zasłoń drużyna[${pos}] (brak)`;
      },
      () => {
        const name = api.team.getMembers()[idx];
        if (name) api.command.send(`zaslon ${name}`, false);
        return true;
      },
    );

    // <key>z → order whole party to shield member at position pos
    registerDev(
      api,
      new RegExp(`^${key}z$`, 'i'),
      `${key}z`,
      () => {
        const name = api.team.getMembers()[idx];
        return name ? `rozkaz: zasłoń drużyna[${pos}]: ${name}` : `rozkaz zasłoń[${pos}] (brak)`;
      },
      () => {
        const name = api.team.getMembers()[idx];
        if (name) api.command.send(`rozkaz druzynie zaslon ${name}`, false);
        return true;
      },
    );

    // <key>x → retreat behind member at position pos
    registerDev(
      api,
      new RegExp(`^${key}x$`, 'i'),
      `${key}x`,
      () => {
        const name = api.team.getMembers()[idx];
        return name ? `schowaj się za drużyna[${pos}]: ${name}` : `schowaj za[${pos}] (brak)`;
      },
      () => {
        const name = api.team.getMembers()[idx];
        if (name) api.command.send(`schowaj sie za ${name}`, false);
        return true;
      },
    );
  });
}
