import type { PluginApi } from '@arkadia/plugin-types';

const LONG_TO_SHORT: Record<string, string> = {
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
  out: 'out'
};

const LOCATIONS_TO_VISIT = [
  'i385831173', 'iec9257cf8', 'ice58e797a', 'i6fa9a3961', 'ib3c706f81', 'if93220491', 'i54714c39d', 'iaed83fe4f', 'i344fee4f4', 'ie88f81363',
  'ifea93f92a', 'i461d17c71', 'i2a5b44fa6', 'i7b4c77850', 'i16fedf887', 'i1515d7419', 'iba855ebd8', 'i6ae39463a', 'i045c550b9', 'i25cc4ddb8',
  'i7c3baa009', 'i7bc01ba67', 'ic364eb52c', 'i2596fde8a', 'ic1991a41b', 'i670eb925e', 'i64b56b17d', 'ia5f6831b5', 'i9ddcf85c8', 'ib8ae42584',
  'i7242cdad9', 'i4058db4a1', 'i20d2cd24b', 'i4f0db0dce', 'i9f835c642', 'i70ad6966f', 'i1433162c2', 'i1601357e9', 'i3313eee74', 'i146c33b32',
  'i3250ce321', 'if200d134c', 'ib325915e0', 'id243d5a92', 'i5b834f3df', 'i4dbfc111e', 'ic81047605', 'if1dccfad9', 'ie153f2884', 'i92e970159',
  'i4dac1a0f6', 'i6aeb5483d', 'ife7a4084d', 'i6788e1f39', 'i0bc1e3e5d', 'iabf4e3eff', 'ie0f684763', 'i49c29280d', 'ifceddf7cf', 'i7599c24a1',
  'i528a9ef2e', 'i02f37cf16', 'ie415d9f73', 'i74d23b736', 'i460d0aa22', 'i7ba75e88e', 'i69d757864', 'i160c3bc8a', 'id44b2cac3', 'i956a52a9a',
  'i6d5f6a26c', 'i8d74a2de8', 'i4c4a962f9', 'i704de0822', 'i3070bea8d', 'i2cb9297df', 'i0740696ed', 'ibc7c633aa', 'i895b2fa36', 'i172774851',
  'i0f2c7400f', 'i0b9b0693a', 'i7282c73e4', 'id106bcb11', 'ib8029387e'
];

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupTraverse(api: PluginApi): () => void {
  let active = false;
  let roomsToVisit: number[] = [];
  let currentDest: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let idMap: Map<string, number> | null = null;

  const getIdMap = (): Map<string, number> => {
    if (!idMap) {
      idMap = new Map();
      const areas = api.map.getAreas();
      if (areas) {
        for (const area of areas) {
          if (area.rooms) {
            for (const room of area.rooms) {
              const iid = room.userData?.internal_id?.trim();
              if (iid && typeof room.id === 'number') {
                idMap.set(iid, room.id);
              }
            }
          }
        }
      }
    }
    return idMap;
  };

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const stop = (): void => {
    active = false;
    currentDest = null;
    roomsToVisit = [];
    clearTimer();
    cecho(api, '\n<yellow>[Traverse] Zatrzymano.\n');
  };

  const autoTraverse = (): void => {
    if (!active) return;

    const current = api.map.getRoom();
    if (!current) return;

    const currentId = typeof current.id === 'number' ? current.id : Number(current.id);
    const visitIdx = roomsToVisit.indexOf(currentId);
    if (visitIdx !== -1) {
      roomsToVisit.splice(visitIdx, 1);
    }

    if (currentDest !== null && currentId !== currentDest) {
      const path = api.map.findPath(currentId, currentDest);
      if (!path || path.length < 2) {
        cecho(api, `\n<red>[Traverse] Brak drogi do pokoju ${currentDest}, pomijam.\n`);
        currentDest = null;
        autoTraverse();
        return;
      }

      const nextId = path[1];
      const exits = { ...(current.exits ?? {}), ...(current.specialExits ?? {}) };
      const dir = Object.keys(exits).find((d) => exits[d] === nextId);

      if (dir) {
        api.command.send(LONG_TO_SHORT[dir] ?? dir);
        return;
      }

      currentDest = null;
    }

    if (roomsToVisit.length === 0) {
      cecho(api, '\n<green>[Traverse] Eksploracja Bretonii zakonczona.\n');
      active = false;
      return;
    }

    currentDest = roomsToVisit.shift() || null;
    autoTraverse();
  };

  const onEnterLocation = (): void => {
    if (!active) return;
    clearTimer();
    const delay = 300 + Math.random() * 300;
    timer = setTimeout(() => {
      timer = null;
      autoTraverse();
    }, delay);
  };

  api.events.on('enterLocation', onEnterLocation);

  api.aliases.register(/^\/bretonia(?:\s+(\S+))?$/, (matches: any) => {
    const fromId = matches?.[1];
    const map = getIdMap();
    let collecting = !fromId;
    const newRooms: number[] = [];

    for (const iid of LOCATIONS_TO_VISIT) {
      if (!collecting && iid === fromId) collecting = true;
      if (collecting) {
        const roomId = map.get(iid);
        if (roomId !== undefined) newRooms.push(roomId);
      }
    }

    if (newRooms.length > 0) newRooms.shift();

    if (newRooms.length === 0) {
      cecho(api, '\n<yellow>[Traverse] Brak pokoi do odwiedzenia.\n');
      return true;
    }

    roomsToVisit = newRooms;
    currentDest = null;
    active = true;
    clearTimer();
    cecho(api, `\n<green>[Traverse] Rozpoczynam eksploracje Bretonii, ${roomsToVisit.length} pokoi do odwiedzenia.\n`);
    autoTraverse();
    return true;
  });

  api.aliases.register(/^\/bretonia-stop$/, () => {
    stop();
    return true;
  });

  return () => {
    clearTimer();
    api.events.off('enterLocation', onEnterLocation);
  };
}
