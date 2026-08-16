import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from '../../../lib/withDelay';
import { registerTextAlias } from '../../../lib/registerTextAlias';

/**
 * Item / environment interaction aliases: throw ball, cloak, dry off,
 * read boards, bakery order, repair all.
 */
export function setupInteractionAliases(api: PluginApi): void {
  // pile <target> - throw ball at target, pick it back up after a short delay
  api.aliases.register(/^pile(?:\s+(.+))?$/, (matches) => {
    const target = matches?.[1]?.trim().toLowerCase();
    if (!target) return true;
    api.command.send(`rzuc pileczka w ${target}`);
    withDelay(234, 890, () => api.command.send('wez pileczke'));
    return true;
  });

  // zpla - put on cloak and fasten with brooch
  api.aliases.register(/^zpla$/, () => {
    api.command.send('zaloz plaszcz');
    api.command.send('zepnij plaszcz spinka');
    return true;
  });

  // brr - shake off water (8 times)
  api.aliases.register(/^brr$/, () => {
    for (let i = 0; i < 8; i++) {
      api.command.send('otrzasnij wode');
    }
    return true;
  });

  // tab - read notice boards / tablets
  api.aliases.register(/^tab$/, () => {
    api.command.send('ob tabliczke');
    api.command.send('ob pergamin');
    api.command.send('pr tablice');
    return true;
  });

  // piek! - order bread at bakery
  api.aliases.register(/^piek!$/, () => {
    api.command.send('otm');
    for (let i = 0; i < 2; i++) api.command.send('zamow bulke');
    for (let i = 0; i < 2; i++) api.command.send('zamow bagietke');
    for (let i = 0; i < 2; i++) api.command.send('zamow chleb');
    api.command.send('ztm');
    return true;
  });

  // napwsz - sharpen all weapons and repair all armor
  api.aliases.register(/^napwsz$/, () => {
    api.command.send('otworz zalozona torbe');
    api.command.send('dob');
    api.command.send('naostrz wszystkie bronie');
    api.command.send('napraw wszystkie zbroje');
    return true;
  });
}
