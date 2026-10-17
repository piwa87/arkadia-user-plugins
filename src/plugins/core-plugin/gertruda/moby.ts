import type { PluginApi } from '@arkadia/plugin-types';
import { registerTokenGate } from '../../../lib/registerTokenGate';

const TAG = 'gertrudaMoby';

/** Tracks troll sightings and deaths for Gertruda's mob map notes. */
export function setupGertrudaMoby(api: PluginApi): void {
  let enabled = false;

  api.aliases.register(/^\/?gt\+$/i, () => {
    enabled = true;
    api.output.print('Automatyczne zaznaczanie trolli: wlaczone.');
    return true;
  });

  api.aliases.register(/^\/?gt-$/i, () => {
    enabled = false;
    api.output.print('Automatyczne zaznaczanie trolli: wylaczone.');
    return true;
  });

  // A living troll's room description starts with two variable descriptors.
  registerTokenGate(
    api,
    'troll',
    /^\S+\s+\S+\s+troll\.$/i,
    (line) => {
      if (enabled) api.command.send('/mob gt');
      return line;
    },
    TAG,
  );

  // Corpse descriptions also confirm trolls are present in the current room.
  registerTokenGate(
    api,
    'trolla',
    /^(?:Cialo\s+\S+\s+\S+|Sterta\s+szczatkow)\s+trolla\.$/i,
    (line) => {
      if (enabled) api.command.send('/mob gt');
      return line;
    },
    TAG,
  );
}
