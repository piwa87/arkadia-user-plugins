import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';
import { storage } from '../../../lib/storage';
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

const LOCATION_WIDTH_LIMIT = 24;
const NAME_WIDTH_LIMIT = 36;
const NOTE_WIDTH_LIMIT = 24;
export const KNOWLEDGE_DOMAIN_STORAGE_KEY = 'knowledge:lastDomain';
const DEFAULT_KNOWLEDGE_DOMAIN = 'Imperium';

function wrapTableCell(value: string, width: number): string[] {
  if (!value) return [''];

  const lines: string[] = [];
  let remaining = value;
  while (remaining.length > width) {
    const candidate = remaining.slice(0, width + 1);
    const breakAt = candidate.lastIndexOf(' ');
    const take = breakAt > 0 ? breakAt : width;
    lines.push(remaining.slice(0, take).trimEnd());
    remaining = remaining.slice(take).trimStart();
  }
  lines.push(remaining);
  return lines;
}

function printKnowledgeTable(
  api: PluginApi,
  entries: RankedKnowledgeEntry[],
  preview: (entry: RankedKnowledgeEntry) => void,
): void {
  const rows = entries.map((entry) => ({
    entry,
    roomId: String(entry.id),
    distance: `${entry.distance} lok.`,
    location: singleLine(entry.location) || `lokacja #${entry.id}`,
    name: singleLine(entry.name),
    note: singleLine(entry.note),
  }));
  const idWidth = Math.max(...rows.map(({ roomId }) => roomId.length));
  const distanceWidth = Math.max(...rows.map(({ distance }) => distance.length));
  const locationWidth = Math.min(
    LOCATION_WIDTH_LIMIT,
    Math.max(...rows.map(({ location }) => location.length)),
  );
  const nameWidth = Math.min(
    NAME_WIDTH_LIMIT,
    Math.max(...rows.map(({ name }) => name.length)),
  );
  const noteWidth = Math.min(
    NOTE_WIDTH_LIMIT,
    Math.max(...rows.map(({ note }) => note.length)),
  );
  const actionWidth = 2;
  const border = `+${'-'.repeat(idWidth + 2)}+${'-'.repeat(distanceWidth + 2)}+${'-'.repeat(locationWidth + 2)}+${'-'.repeat(nameWidth + 2)}+${'-'.repeat(noteWidth + 2)}+${'-'.repeat(actionWidth + 2)}+`;

  const borderColor = api.colors.fromHex('#777777');
  const idColor = api.colors.fromHex('#2f855a');
  const rowColor = api.colors.fromHex('#929292');
  const currentRowColor = api.colors.fromHex('#6f8f78');
  const previewColor = api.colors.fromHex('#607d9b');

  const printColored = (text: string, color: FormatStateSnapshot) => {
    const buffer = new api.AnsiAwareBuffer(text);
    buffer.color([0, text.length], color);
    api.output.print(buffer);
  };

  printColored(border, borderColor);
  rows.forEach(({ entry, roomId, distance, location, name, note }) => {
    const dataColor = entry.distance === 0 ? currentRowColor : rowColor;
    const locationLines = wrapTableCell(location, locationWidth);
    const nameLines = wrapTableCell(name, nameWidth);
    const noteLines = wrapTableCell(note, noteWidth);
    const lineCount = Math.max(locationLines.length, nameLines.length, noteLines.length);

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const buffer = new api.AnsiAwareBuffer();
      const isFirstLine = lineIndex === 0;
      buffer.append('| ', dataColor);
      if (isFirstLine) {
        buffer.append(roomId, {
          ...idColor,
          underline: true,
          hyperlink: {
            title: `/prowadz ${entry.id}`,
            onClick: () => {
              void api.command.send(`/prowadz ${entry.id}`);
            },
          },
        });
      } else {
        buffer.append(' '.repeat(roomId.length), dataColor);
      }
      buffer.append(
        `${' '.repeat(idWidth - roomId.length)} | ${(isFirstLine ? distance : '').padStart(distanceWidth)} | ${(locationLines[lineIndex] ?? '').padEnd(locationWidth)} | ${(nameLines[lineIndex] ?? '').padEnd(nameWidth)} | ${(noteLines[lineIndex] ?? '').padEnd(noteWidth)} | `,
        dataColor,
      );
      if (isFirstLine) {
        buffer.append('👁', {
          ...previewColor,
          underline: false,
          hyperlink: {
            title: `Podglad przez 2 sekundy: ${name} (${entry.id})`,
            onClick: () => preview(entry),
          },
        });
      } else {
        buffer.append(' '.repeat('👁'.length), dataColor);
      }
      buffer.append(`${' '.repeat(actionWidth - '👁'.length)} |`, dataColor);
      api.output.print(buffer);
    }
  });
  printColored(border, borderColor);
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
): () => void {
  let previewTimer: ReturnType<typeof setTimeout> | null = null;
  let previewOriginId: number | null = null;
  const storedDomain = storage.get<unknown>(KNOWLEDGE_DOMAIN_STORAGE_KEY);
  let lastDomain = typeof storedDomain === 'string' && storedDomain.trim()
    ? storedDomain.trim()
    : DEFAULT_KNOWLEDGE_DOMAIN;

  const finishPreview = () => {
    const originId = previewOriginId;
    previewTimer = null;
    previewOriginId = null;
    if (originId !== null) void api.command.send(`/ustaw ${originId}`);
  };

  const preview = (entry: RankedKnowledgeEntry) => {
    if (previewTimer === null) {
      const currentId = api.map.getRoom()?.id;
      if (currentId === undefined) {
        api.output.print('[Wiedza] Nie mozna uruchomic podgladu: mapa nie zna biezacej lokacji.');
        return;
      }
      previewOriginId = currentId;
    } else {
      clearTimeout(previewTimer);
    }

    void api.command.send(`/ustaw ${entry.id}`);
    previewTimer = setTimeout(finishPreview, 2000);
  };

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

    const gmcpDomain = api.gmcp.get()?.room?.info?.map?.domain;
    if (typeof gmcpDomain === 'string' && gmcpDomain.trim()) {
      lastDomain = gmcpDomain.trim();
      try {
        storage.set(KNOWLEDGE_DOMAIN_STORAGE_KEY, lastDomain);
      } catch {
        // The in-memory value still works when localStorage is unavailable.
      }
    }
    const currentDomain = lastDomain;

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
    printKnowledgeTable(api, nearest, preview);

    const unreachable = missing.length - nearest.length;
    if (unreachable > 0 && nearest.length < 20) {
      api.output.print(`[Wiedza] Pominieto wpisy bez osiagalnej trasy: ${unreachable}.`);
    }
    return true;
  });

  return () => {
    if (previewTimer !== null) clearTimeout(previewTimer);
    previewTimer = null;
    previewOriginId = null;
  };
}
