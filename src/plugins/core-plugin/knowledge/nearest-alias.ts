import type { PluginApi } from '@arkadia/plugin-types';
import { createRoomDistanceLookup } from '../../../lib/mapDistance';
import { createMapPreviewController } from '../../../lib/mapPreview';
import { printOutputTable } from '../../../lib/outputTable';
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
  const getDistance = createRoomDistanceLookup(map, fromRoomId);

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
  const borderColor = api.colors.fromHex('#777777');
  const idColor = api.colors.fromHex('#2f855a');
  const rowColor = api.colors.fromHex('#929292');
  const currentRowColor = api.colors.fromHex('#6f8f78');
  const previewColor = api.colors.fromHex('#607d9b');

  printOutputTable({
    api,
    rows,
    borderState: borderColor,
    rowState: ({ entry }) => entry.distance === 0 ? currentRowColor : rowColor,
    columns: [
      {
        cell: ({ entry, roomId }) => ({
          text: roomId,
          firstLineOnly: true,
          state: {
            ...idColor,
            underline: true,
            hyperlink: {
              title: `/prowadz ${entry.id}`,
              onClick: () => { void api.command.send(`/prowadz ${entry.id}`); },
            },
          },
        }),
      },
      { align: 'right', cell: ({ distance }) => ({ text: distance, firstLineOnly: true }) },
      { maxWidth: LOCATION_WIDTH_LIMIT, cell: ({ location }) => ({ text: location, wrap: true }) },
      { maxWidth: NAME_WIDTH_LIMIT, cell: ({ name }) => ({ text: name, wrap: true }) },
      { maxWidth: NOTE_WIDTH_LIMIT, cell: ({ note }) => ({ text: note, wrap: true }) },
      {
        cell: ({ entry, name }) => ({
          text: '👁',
          firstLineOnly: true,
          state: {
            ...previewColor,
            underline: false,
            hyperlink: {
              title: `Podglad przez 2 sekundy: ${name} (${entry.id})`,
              onClick: () => preview(entry),
            },
          },
        }),
      },
    ],
  });
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
  const mapPreview = createMapPreviewController(api, {
    durationMs: 2_000,
    missingRoomMessage: '[Wiedza] Nie mozna uruchomic podgladu: mapa nie zna biezacej lokacji.',
  });
  const storedDomain = storage.get<unknown>(KNOWLEDGE_DOMAIN_STORAGE_KEY);
  let lastDomain = typeof storedDomain === 'string' && storedDomain.trim()
    ? storedDomain.trim()
    : DEFAULT_KNOWLEDGE_DOMAIN;

  const preview = (entry: RankedKnowledgeEntry) => mapPreview.preview(entry.id);

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

  return () => mapPreview.dispose();
}
