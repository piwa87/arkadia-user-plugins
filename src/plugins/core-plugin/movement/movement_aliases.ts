import type { PluginApi } from '@arkadia/plugin-types';
import { setupGaleonAlias } from './galeon';
import { setupRandomExitAlias } from './random_exit';
import { setupMovementSpeedAliases } from './speeds';

export function setupMovementAliases(api: PluginApi): void {
  setupMovementSpeedAliases(api);
  setupRandomExitAlias(api);
  setupGaleonAlias(api);

  // pm - sneak
  api.aliases.register(/^pm$/, () => {
    api.command.send('przemknij');
    return true;
  });

  // pmd - sneak with team
  api.aliases.register(/^pmd$/, () => {
    api.command.send('przemknij z druzyna');
    return true;
  });

  api.aliases.register(/^pp-$/i, () => {
    api.command.send('/pre_walk-');
    api.command.send('/post_walk-');
    return true;
  });
}
