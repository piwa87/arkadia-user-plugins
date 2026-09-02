import type { PluginApi } from '@arkadia/plugin-types';
import { setupGaleonAlias } from './galeon';
import { setupRandomExitAlias } from './random_exit';
import { setupMovementSpeedAliases } from './speeds';

export function runVid(api: PluginApi): void {
  api.output.print('--> ruszam');
  void api.command.send('/dalej 2');
  void api.command.send('/walkerw');
}

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

  api.aliases.register(/^vid$/i, () => {
    runVid(api);
    return true;
  });
}
