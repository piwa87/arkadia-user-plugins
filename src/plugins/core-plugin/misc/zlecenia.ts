import type { PluginApi } from '@arkadia/plugin-types';
import { registerTokenGate } from '../../../lib/registerTokenGate';

const TAG = 'zlecenia';

/** Seller order aliases and automatic order-list refresh. */
export function setupZleceniaAliases(api: PluginApi): void {
  api.aliases.register(/^zl$/i, () => {
    api.command.send('zapytaj sprzedawce o zlecenie');
    return true;
  });

  api.aliases.register(/^zl!$/i, () => {
    api.command.send('/zlecenia');
    return true;
  });

  registerTokenGate(
    api,
    'zamowienia',
    /^(.+) mowi do ciebie: Na realizacje zamowienia mam /,
    (line) => {
      api.command.send('/zlecenia');
      return line;
    },
    TAG,
  );
}
