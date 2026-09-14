import type { PluginApi } from '@arkadia/plugin-types';
import { getCharName } from '../../../lib/getCharName';

export type KnowledgeDetailsType = 'fight' | 'books' | 'exploration';

export interface KnowledgeSourceEntry {
  Rodzaj: string;
  Wiedza: string;
  id: number | null;
  Domena?: string;
  lokalizacja?: string;
  note?: string;
}

interface KnowledgeReportEntry {
  name: string;
  status: 'known' | 'missing';
  id?: number | null;
  lokalizacja?: string;
  note?: string;
}

interface KnowledgeReportTypeSummary {
  entries: KnowledgeReportEntry[];
}

interface KnowledgeReportCategory {
  name: string;
  types: Partial<Record<KnowledgeDetailsType, KnowledgeReportTypeSummary>>;
}

interface KnowledgeReportPayload {
  categories: KnowledgeReportCategory[];
}

export interface MissingKnowledgeEntry {
  character: string;
  domain: string;
  category: string;
  type: KnowledgeDetailsType;
  name: string;
  id: number;
  location: string;
  note: string;
}

export type KnowledgeReportState =
  | { status: 'loading'; entries: MissingKnowledgeEntry[] }
  | { status: 'ready'; character: string; entries: MissingKnowledgeEntry[]; updatedAt: number }
  | { status: 'error'; entries: MissingKnowledgeEntry[]; error: string };

type StateListener = (state: KnowledgeReportState) => void;

type UntypedEventsApi = {
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
};

const FEMALE_TO_MALE_PREFIX = new Map<string, string>([
  ['Analizowalas', 'Analizowales'],
  ['Bladzilas', 'Bladziles'],
  ['Bylas', 'Byles'],
  ['Czytalas', 'Czytales'],
  ['Dalas', 'Dales'],
  ['Dostarczylas', 'Dostarczyles'],
  ['Doswiadczylas', 'Doswiadczyles'],
  ['Dotykalas', 'Dotykales'],
  ['Doznalas', 'Doznales'],
  ['Dowiedzialas', 'Dowiedziales'],
  ['dowiedzialas', 'dowiedziales'],
  ['Odbylas', 'Odbyles'],
  ['Odczulas', 'Odczules'],
  ['Odczytalas', 'Odczytales'],
  ['Odnalazlas', 'Odnalazles'],
  ['Odprawilas', 'Odprawiles'],
  ['Ogladalas', 'Ogladales'],
  ['ogladalas', 'ogladales'],
  ['Otworzylas', 'Otworzyles'],
  ['Podrozowalas', 'Podrozowales'],
  ['Poznalas', 'Poznales'],
  ['Probowalas', 'Probowales'],
  ['Przeczytalas', 'Przeczytales'],
  ['Przekonalas', 'Przekonales'],
  ['Przemierzalas', 'Przemierzales'],
  ['Przeszukalas', 'Przeszukales'],
  ['Przetrwalas', 'Przetrwales'],
  ['Przezylas', 'Przezyles'],
  ['Przygladalas', 'Przygladales'],
  ['Rozbilas', 'Rozbiles'],
  ['Rozerwalas', 'Rozerwales'],
  ['Rozmawialas', 'Rozmawiales'],
  ['Sluchalas', 'Sluchales'],
  ['Slyszalas', 'Slyszales'],
  ['slyszalas', 'slyszales'],
  ['Skosztowalas', 'Skosztowales'],
  ['Spotkalas', 'Spotkales'],
  ['Stalas', 'Stales'],
  ['Starlas', 'Starles'],
  ['Uzylas', 'Uzyles'],
  ['Widzialas', 'Widziales'],
  ['Wkroczylas', 'Wkroczyles'],
  ['Wpadlas', 'Wpadles'],
  ['Wyleczylas', 'Wyleczyles'],
  ['Wypilas', 'Wypiles'],
  ['Wysluchalas', 'Wysluchales'],
  ['Wyzwolilas', 'Wyzwoliles'],
  ['Wzbudzilas', 'Wzbudziles'],
  ['Zabezpieczylas', 'Zabezpieczyles'],
  ['Zabilas', 'Zabiles'],
  ['Zebralas', 'Zebrales'],
  ['Zglebilas', 'Zglebiles'],
  ['zyskalas', 'zyskales'],
]);

let state: KnowledgeReportState = { status: 'loading', entries: [] };
const stateListeners = new Set<StateListener>();

function publish(next: KnowledgeReportState): void {
  state = next;
  for (const listener of stateListeners) listener(state);
}

export function getKnowledgeReportState(): KnowledgeReportState {
  return state;
}

export function subscribeKnowledgeReport(listener: StateListener): () => void {
  stateListeners.add(listener);
  listener(state);
  return () => stateListeners.delete(listener);
}

export function normalizeKnowledgeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/u, '');
}

export function canonicalizeKnowledgeName(value: string): string {
  for (const [female, male] of FEMALE_TO_MALE_PREFIX) {
    if (value === female) return male;
    if (value.startsWith(`${female} `) || value.startsWith(`${female},`)) {
      return male + value.slice(female.length);
    }

    const position = value.indexOf(` ${female}`);
    if (position !== -1) {
      const after = position + female.length + 1;
      if (after === value.length || value[after] === ' ' || value[after] === ',') {
        return value.slice(0, position + 1) + male + value.slice(after);
      }
    }
  }
  return value;
}

function isReportPayload(value: unknown): value is KnowledgeReportPayload {
  if (!value || typeof value !== 'object') return false;
  return Array.isArray((value as { categories?: unknown }).categories);
}

export function buildMissingKnowledgeEntries(
  payload: KnowledgeReportPayload,
  sourceEntries: KnowledgeSourceEntry[],
  character: string,
): MissingKnowledgeEntry[] {
  const sourceByName = new Map<string, KnowledgeSourceEntry[]>();
  for (const sourceEntry of sourceEntries) {
    if (typeof sourceEntry.Wiedza !== 'string') continue;
    const key = normalizeKnowledgeName(sourceEntry.Wiedza);
    const entries = sourceByName.get(key) ?? [];
    entries.push(sourceEntry);
    sourceByName.set(key, entries);
  }

  const result: MissingKnowledgeEntry[] = [];
  const types: KnowledgeDetailsType[] = ['fight', 'books', 'exploration'];

  for (const category of payload.categories) {
    for (const type of types) {
      const reportEntries = category.types[type]?.entries ?? [];
      for (const reportEntry of reportEntries) {
        if (reportEntry.status !== 'missing' || reportEntry.id == null) continue;

        const canonicalName = canonicalizeKnowledgeName(reportEntry.name);
        const matches = sourceByName.get(normalizeKnowledgeName(canonicalName)) ?? [];
        for (const sourceEntry of matches) {
          if (sourceEntry.id == null || !sourceEntry.Domena) continue;
          result.push({
            character,
            domain: sourceEntry.Domena,
            category: category.name,
            type,
            name: canonicalName,
            id: sourceEntry.id,
            location: sourceEntry.lokalizacja ?? reportEntry.lokalizacja ?? '',
            note: sourceEntry.note ?? reportEntry.note ?? '',
          });
        }
      }
    }
  }

  return result.sort(
    (left, right) =>
      left.domain.localeCompare(right.domain) ||
      left.location.localeCompare(right.location) ||
      left.id - right.id ||
      left.name.localeCompare(right.name),
  );
}

export function getMissingKnowledgeEntries(options: {
  domain?: string;
  requireLocationId?: boolean;
} = {}): MissingKnowledgeEntry[] {
  const domain = options.domain?.toLowerCase();
  return state.entries.filter((entry) => {
    if (domain && entry.domain.toLowerCase() !== domain) return false;
    if (options.requireLocationId && !Number.isFinite(entry.id)) return false;
    return true;
  });
}

async function loadKnowledgeSourceEntries(): Promise<KnowledgeSourceEntry[]> {
  const urls = [
    new URL('data/knowledge.json', import.meta.url),
    new URL('../data/knowledge.json', import.meta.url),
  ].filter((url, index, candidates) =>
    candidates.findIndex((candidate) => candidate.href === url.href) === index,
  );
  const failures: string[] = [];

  for (const dataUrl of urls) {
    try {
      const response = await fetch(dataUrl);
      if (!response.ok) {
        failures.push(`${dataUrl.href}: HTTP ${response.status}`);
        continue;
      }
      const json: unknown = await response.json();
      if (!Array.isArray(json)) throw new Error('knowledge.json nie zawiera tablicy');
      return json as KnowledgeSourceEntry[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${dataUrl.href}: ${message}`);
    }
  }

  throw new Error(failures.join('; '));
}

export async function setupKnowledgeReportData(api: PluginApi): Promise<() => void> {
  const events = api.events as unknown as UntypedEventsApi;
  let sourceEntries: KnowledgeSourceEntry[] = [];
  let lastPayload: KnowledgeReportPayload | null = null;
  let disposed = false;

  const rebuild = (): void => {
    if (!lastPayload || sourceEntries.length === 0 || disposed) return;
    const character = getCharName(api);
    publish({
      status: 'ready',
      character,
      entries: buildMissingKnowledgeEntries(lastPayload, sourceEntries, character),
      updatedAt: Date.now(),
    });
  };

  const handleReport = (...args: unknown[]): void => {
    const payload = args[0];
    if (!isReportPayload(payload)) return;
    lastPayload = payload;
    rebuild();
  };

  const requestReport = (): void => {
    events.emit('requestKnowledgeDetailsReport');
  };

  const handleKnowledgeUpdated = (): void => requestReport();

  events.on('knowledgeDetailsReport', handleReport);
  events.on('knowledgeDetailsUpdated', handleKnowledgeUpdated);

  try {
    sourceEntries = await loadKnowledgeSourceEntries();
    rebuild();
    requestReport();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    publish({ status: 'error', entries: [], error: message });
    console.error('[Core Plugin] Nie udalo sie zaladowac danych wiedzy:', error);
  }

  return () => {
    disposed = true;
    events.off('knowledgeDetailsReport', handleReport);
    events.off('knowledgeDetailsUpdated', handleKnowledgeUpdated);
  };
}
