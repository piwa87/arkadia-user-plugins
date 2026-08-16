import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from '../../../lib/withDelay';

/**
 * Movement-related aliases: speed settings (i1-i5), random exit (mran),
 * and galleon navigation sequence (gale!).
 */
export function setupMiscMovementAliases(api: PluginApi): void {
  // i1-i5 - movement speeds
  const speeds: Record<string, string> = {
    '1': 'niespiesznie',
    '2': 'marszem',
    '3': 'truchtem',
    '4': 'biegiem',
    '5': 'szybkim biegiem',
  };
  api.aliases.register(/^i([1-5])$/, (matches) => {
    const speed = speeds[matches![1]];
    if (speed) api.command.send(`idz ${speed}`);
    return true;
  });

  // mran - send a random exit from the current room
  const dirToCmd: Record<string, string> = {
    north: 'n',
    south: 's',
    east: 'e',
    west: 'w',
    northeast: 'ne',
    northwest: 'nw',
    southeast: 'se',
    southwest: 'sw',
    up: 'u',
    down: 'd',
    in: 'in',
    out: 'out',
  };

  api.aliases.register(/^mran$/, () => {
    const room = api.map.getRoom();
    if (!room) {
      api.output.print('[mran] brak danych mapy');
      return true;
    }

    const exits = [
      ...Object.keys(room.exits).map((dir) => dirToCmd[dir] ?? dir),
      ...Object.keys(room.specialExits ?? {}),
    ];

    if (exits.length === 0) {
      api.output.print('[mran] brak wyjsc');
      return true;
    }

    const chosen = exits[Math.floor(Math.random() * exits.length)];
    api.command.send(chosen);
    return true;
  });

  // gale! - navigate through the galeon in sequence with random delays
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
    let i = 0;
    const step = () => {
      if (i >= rooms.length) return;
      api.command.send(rooms[i++]);
      if (i < rooms.length) withDelay(56, 234, step);
    };
    step();
    return true;
  });
}
