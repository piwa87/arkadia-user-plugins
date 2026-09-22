import type { PluginApi } from '@arkadia/plugin-types';

type MapPathApi = Pick<PluginApi['map'], 'findPath'>;

export function getRoomDistance(
  map: MapPathApi,
  fromRoomId: number,
  toRoomId: number,
): number | null {
  if (fromRoomId === toRoomId) return 0;

  try {
    const path = map.findPath(fromRoomId, toRoomId);
    return path && path.length > 0 ? Math.max(0, path.length - 1) : null;
  } catch {
    return null;
  }
}

export function createRoomDistanceLookup(
  map: MapPathApi,
  fromRoomId: number,
): (roomId: number) => number | null {
  const cache = new Map<number, number | null>();

  return (roomId: number): number | null => {
    if (cache.has(roomId)) return cache.get(roomId) ?? null;
    const distance = getRoomDistance(map, fromRoomId, roomId);
    cache.set(roomId, distance);
    return distance;
  };
}
