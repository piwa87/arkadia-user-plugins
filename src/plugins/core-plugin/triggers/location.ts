import type { PluginApi } from '@arkadia/plugin-types';
import { setBind } from '../aliases/bind';

export function setupLocationTriggers(api: PluginApi): void {
  const isBlacksmith = (room: { name?: string; roomChar?: string }) =>
    room.roomChar === 'K' || /kowal/i.test(room.name ?? '');

  api.events.on('mapMove', () => {
    const room = api.map.getRoom();
    if (room && isBlacksmith(room)) {
      setBind(api, 'napwsz', { label: 'kowal' });
    }
  });
}
