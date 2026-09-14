import type { PluginApi } from '@arkadia/plugin-types';
import {
  getKnowledgeReportState,
  getMissingKnowledgeEntries,
  type KnowledgeReportState,
  type MissingKnowledgeEntry,
} from './report-data';

export interface RankedKnowledgeEntry extends MissingKnowledgeEntry {
  distance: number;
}

type KnowledgeMapApi = Pick<PluginApi['map'], 'findPath'>;

export function rankNearestKnowledgeEntries(
  map: KnowledgeMapApi,
  fromRoomId: number,
  entries: MissingKnowledgeEntry[],
  limit = 20,
): RankedKnowledgeEntry[] {
  const distanceByRoom = new Map<number, number | null>();

  const getDistance = (roomId: number): number | null => {
    const cached = distanceByRoom.get(roomId);
    if (cached !== undefined || distanceByRoom.has(roomId)) return cached ?? null;

    let distance: number | null = null;
    try {
      const path = map.findPath(fromRoomId, roomId);
      if (path && path.length > 0) distance = Math.max(path.length - 1, 0);
    } catch {
      distance = null;
    }
    distanceByRoom.set(roomId, distance);
    return distance;
  };

  return entries
    .map((entry): RankedKnowledgeEntry | null => {
      const distance = getDistance(entry.id);
      return distance == null ? null : { ...entry, distance };
    })
    .filter((entry): entry is RankedKnowledgeEntry => entry !== null)
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.location.localeCompare(right.location) ||
        left.id - right.id ||
        left.name.localeCompare(right.name),
    )
    .slice(0, Math.max(0, limit));
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeDomain(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized === 'empire' ? 'imperium' : normalized;
}

export function matchesKnowledgeDomain(entryDomain: string, currentDomain: string): boolean {
  const expected = normalizeDomain(currentDomain);
  return entryDomain
    .split('/')
    .some((domain) => normalizeDomain(domain) === expected);
}

export function setupNearestKnowledgeAlias(
  api: PluginApi,
  readState: () => KnowledgeReportState = getKnowledgeReportState,
  readEntries: typeof getMissingKnowledgeEntries = getMissingKnowledgeEntries,
): void {
  api.aliases.register(/^wiedza20$/i, () => {
    const state = readState();
    if (state.status === 'loading') {
      api.output.print('[Wiedza] Dane raportu sa jeszcze ladowane. Sprobuj ponownie za chwile.');
      return true;
    }
    if (state.status === 'error') {
      api.output.print(`[Wiedza] Nie udalo sie zaladowac danych: ${state.error}`);
      return true;
    }

    const currentRoom = api.map.getRoom();
    if (!currentRoom) {
      api.output.print('[Wiedza] Aktualna lokacja mapy nie jest znana.');
      return true;
    }

    const currentDomain = api.gmcp.get()?.room?.info?.map?.domain;
    if (typeof currentDomain !== 'string' || !currentDomain.trim()) {
      api.output.print('[Wiedza] Aktualna domena nie jest dostepna w GMCP.');
      return true;
    }

    const missing = readEntries({ requireLocationId: true }).filter((entry) =>
      matchesKnowledgeDomain(entry.domain, currentDomain),
    );
    if (missing.length === 0) {
      api.output.print(`[Wiedza] Brak nieukonczonych wpisow z lokacja w domenie ${currentDomain}.`);
      return true;
    }

    const nearest = rankNearestKnowledgeEntries(api.map, currentRoom.id, missing, 20);
    if (nearest.length === 0) {
      api.output.print(`[Wiedza] Nie znaleziono osiagalnej trasy do wpisow w domenie ${currentDomain}.`);
      return true;
    }

    api.output.print(
      `[Wiedza] ${nearest.length} najblizszych brakujacych wpisow — ${currentDomain} (z #${currentRoom.id}):`,
    );
    nearest.forEach((entry, index) => {
      const location = singleLine(entry.location) || `lokacja #${entry.id}`;
      const note = singleLine(entry.note);
      const suffix = note ? ` | ${note}` : '';
      api.output.print(
        `${index + 1}. [${entry.distance}] #${entry.id} | ${location} | ${singleLine(entry.name)}${suffix}`,
      );
    });

    const unreachable = missing.length - nearest.length;
    if (unreachable > 0 && nearest.length < 20) {
      api.output.print(`[Wiedza] Pominieto wpisy bez osiagalnej trasy: ${unreachable}.`);
    }
    return true;
  });
}
