import type { PluginApi } from '@arkadia/plugin-types';
import { setBind } from '../f';

export function setupLocationTriggers(api: PluginApi): () => void {
  const isBlacksmith = (room: { name?: string; roomChar?: string }) =>
    room.roomChar === 'K' || /kowal/i.test(room.name ?? '');

  const onMapMove = () => {
    const room = api.map.getRoom();
    if (room && isBlacksmith(room)) {
      setBind(api, 'napwsz', { label: 'kowal' });
    }
  };
  api.events.on('mapMove', onMapMove);

  return () => api.events.off('mapMove', onMapMove);
}
