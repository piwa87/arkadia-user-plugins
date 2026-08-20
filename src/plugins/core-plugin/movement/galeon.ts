import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from '../../../lib/withDelay';

export function setupGaleonAlias(api: PluginApi): void {
  api.aliases.register(/^gale!$/, () => {
    const rooms = [
      'dziob',
      'sterburta',
      'd',
      'kajuta',
      'korytarz',
      'rufa',
      'druga',
      'korytarz',
      'pierwsza',
      'korytarz',
      'rufa',
      'czwarta',
      'korytarz',
      'trzecia',
      'korytarz',
      'dziob',
      'dziob',
      'u',
      'srodokrecie',
      'rufa',
      'bakburta',
      'srodokrecie',
    ];
    let index = 0;
    const step = () => {
      if (index >= rooms.length) return;
      api.command.send(rooms[index++]);
      if (index < rooms.length) withDelay(56, 234, step);
    };
    step();
    return true;
  });
}
