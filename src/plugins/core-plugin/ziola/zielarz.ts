import type { PluginApi } from '@arkadia/plugin-types';
import { storage } from '../../../lib/storage';
import { pakujZiola } from './pakuj';

const SEARCH_DELAY_MIN = 6123;
const SEARCH_DELAY_MAX = 6650;
const HUMAN_DELAY_MIN = 700;
const HUMAN_DELAY_MAX = 1800;
const DEFAULT_LOCATION_LIMIT = 9;
const PACK_EVERY_LOCATIONS = 3;
const MOVE_TIMEOUT_MS = 10_000;
const SEARCH_MEMORY_MS = 30 * 60 * 1000;
const SEARCH_MEMORY_KEY = 'zielarz-searched-rooms';

const DIRECTION_COMMANDS: Record<string, string> = {
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

type Room = NonNullable<ReturnType<PluginApi['map']['getRoom']>>;
type SearchMemory = Record<string, number>;

const activeStops = new Set<() => void>();

/** Stop every active zielarz route (normally there is only one). */
export function stopZielarz(): void {
  activeStops.forEach((stop) => stop());
}

export function pickUnvisitedExit(room: Room, visited: ReadonlySet<number>): string | null {
  const available = Object.entries(room.exits)
    .filter(([, roomId]) => typeof roomId === 'number' && !visited.has(roomId))
    .map(([direction]) => DIRECTION_COMMANDS[direction] ?? direction);

  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function loadSearchMemory(now = Date.now()): Map<number, number> {
  const memory = storage.get<SearchMemory>(SEARCH_MEMORY_KEY) ?? {};
  const active = new Map<number, number>();

  for (const [roomId, searchedAt] of Object.entries(memory)) {
    const id = Number(roomId);
    if (!Number.isSafeInteger(id) || !Number.isFinite(searchedAt)) continue;
    if (now - searchedAt >= SEARCH_MEMORY_MS) continue;
    active.set(id, searchedAt);
  }

  storage.set(SEARCH_MEMORY_KEY, Object.fromEntries(active));
  return active;
}

function rememberSearch(memory: Map<number, number>, roomId: number): void {
  memory.set(roomId, Date.now());
  storage.set(SEARCH_MEMORY_KEY, Object.fromEntries(memory));
}

/**
 * Register automatic herb gathering across adjacent, unvisited map rooms.
 *
 * `ziel [count]` starts the route (default: 9 locations).
 * `ziel!` stops it immediately.
 */
export function setupZielarz(api: PluginApi): () => void {
  let active = false;
  let clearPendingWait: (() => void) | null = null;

  const stop = (message?: string): void => {
    active = false;
    clearPendingWait?.();
    clearPendingWait = null;
    if (message) api.output.print(message);
  };
  activeStops.add(stop);

  const delay = (minMs: number, maxMs: number): Promise<boolean> => new Promise((resolve) => {
    const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs);
    const timeout = setTimeout(() => {
      clearPendingWait = null;
      resolve(active);
    }, ms);
    clearPendingWait = () => {
      clearTimeout(timeout);
      resolve(false);
    };
  });

  const searchDelay = () => delay(SEARCH_DELAY_MIN, SEARCH_DELAY_MAX);
  const humanDelay = () => delay(HUMAN_DELAY_MIN, HUMAN_DELAY_MAX);

  const waitForMapMove = (): Promise<boolean> => new Promise((resolve) => {
    const onMapMove = () => finish(true);
    const timeout = setTimeout(() => finish(false), MOVE_TIMEOUT_MS);

    const finish = (moved: boolean) => {
      clearTimeout(timeout);
      api.events.off('mapMove', onMapMove);
      clearPendingWait = null;
      resolve(moved && active);
    };

    clearPendingWait = () => finish(false);
    api.events.on('mapMove', onMapMove);
  });

  const gather = async (limit: number): Promise<void> => {
    const startingRoom = api.map.getRoom();
    if (!startingRoom) {
      stop('Zielarz: brak danych mapy.');
      return;
    }

    const searchedRecently = loadSearchMemory();
    const visited = new Set<number>([startingRoom.id]);
    let searched = 0;
    api.output.print(`Zielarz: zaczynam trase na ${limit} lokacji.`);

    while (active && searched < limit) {
      const room = api.map.getRoom();
      if (!room) {
        stop('Zielarz: utracono dane mapy.');
        return;
      }

      if (searchedRecently.has(room.id)) {
        api.output.print('Zielarz: ta lokacja byla juz niedawno przeszukana.');
        if (!await humanDelay()) break;

        const blocked = new Set([...visited, ...searchedRecently.keys()]);
        const direction = pickUnvisitedExit(room, blocked);
        if (!direction) {
          stop('Zielarz: brak wolnego, nieodwiedzonego wyjscia.');
          return;
        }

        const moved = waitForMapMove();
        await api.command.send(direction);
        if (!await moved) {
          if (active) stop('Zielarz: ruch nie potwierdzil sie, zatrzymano.');
          return;
        }

        const nextRoom = api.map.getRoom();
        if (!nextRoom) {
          stop('Zielarz: utracono dane mapy.');
          return;
        }
        visited.add(nextRoom.id);
        continue;
      }

      await api.command.send('szukaj ziol');
      if (!await searchDelay()) break;
      await api.command.send('szukaj ziol');
      if (!await searchDelay()) break;

      rememberSearch(searchedRecently, room.id);

      // Brief pause before choosing a direction, like manual play.
      if (!await humanDelay()) break;

      searched += 1;
      if (searched % PACK_EVERY_LOCATIONS === 0) {
        // Do not pack immediately after the search; pause before and after it.
        if (!await humanDelay()) break;
        pakujZiola(api, undefined, 3);
        if (!await humanDelay()) break;
      }
      if (searched >= limit) break;

      const blocked = new Set([...visited, ...searchedRecently.keys()]);
      const direction = pickUnvisitedExit(room, blocked);
      if (!direction) {
        stop(`Zielarz: brak nieodwiedzonych wyjsc po ${searched} lokacjach.`);
        return;
      }

      const moved = waitForMapMove();
      await api.command.send(direction);
      if (!await moved) {
        if (active) stop('Zielarz: ruch nie potwierdzil sie, zatrzymano.');
        return;
      }

      const nextRoom = api.map.getRoom();
      if (!nextRoom) {
        stop('Zielarz: utracono dane mapy.');
        return;
      }
      visited.add(nextRoom.id);
    }

    if (!active) return;
    if (searched % PACK_EVERY_LOCATIONS !== 0) {
      if (!await humanDelay()) return;
      pakujZiola(api, undefined, 3);
    }
    stop(`Zielarz: zakonczono po ${searched} lokacjach.`);
  };

  const ids = [
    api.aliases.register(/^ziel(?:\s+(\d+))?$/i, (matches) => {
      if (active) {
        api.output.print('Zielarz juz pracuje. Uzyj ziel! aby zatrzymac.');
        return true;
      }

      const limit = matches?.[1] ? Number(matches[1]) : DEFAULT_LOCATION_LIMIT;
      if (!Number.isSafeInteger(limit) || limit <= 0) {
        api.output.print('Uzycie: ziel [liczba-lokacji]');
        return true;
      }

      active = true;
      void gather(limit).catch(() => stop('Zielarz: wystapil blad, zatrzymano.'));
      return true;
    }),
    api.aliases.register(/^ziel!$/i, () => {
      stop('Zielarz: zatrzymano.');
      return true;
    }),
  ];

  return () => {
    stop();
    activeStops.delete(stop);
    ids.forEach((id) => api.aliases.remove(id));
  };
}
