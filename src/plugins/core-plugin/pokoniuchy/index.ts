import type { PluginApi } from '@arkadia/plugin-types';
import { escapeRegex } from '../../../lib/escapeRegex';
import { createRoomDistanceLookup } from '../../../lib/mapDistance';
import { createMapPreviewController } from '../../../lib/mapPreview';
import { printOutputTable } from '../../../lib/outputTable';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { storage } from '../../../lib/storage';
import { runVid } from '../movement/movement_aliases';

export const POK_TAG = 'pokoniuchy';
export const POK_STORAGE_KEY = 'pokoniuchy:findings';
const LEGACY_POK_STORAGE_KEY = 'mod_pok:findings';

// Shorty widoczne w dostarczonej tabeli. Kolejne odmiany mozna dopisywac tutaj.
export const POK_SHORTS = [
  'Drapiezny wezowaty wipper',
  'Duza drapiezna endriaga',
  'Duza zwinna endriaga',
  'Galezowaty pokoniunkcyjny klabart',
  'Omszala jadowita kergulena',
  'Pokoniunkcyjny glazowy stwor',
  'Pospolita wezowata wiwerna',
  'Potezna skrzydlata bestia',
  'Rdzawofutra masywna mantikora',
  'Szybki agresywny widlogon',
  'Wezowaty grozny stwor',
  'Wielki skrzydlaty oszluzg',
] as const;

const GATE_WORDS = ['bestia', 'endriaga', 'kergulena', 'klabart', 'mantikora', 'oszluzg', 'stwor', 'widlogon', 'wipper', 'wiwerna'];
const SHORT_PATTERN = new RegExp(`\\b(?:${POK_SHORTS.map(escapeRegex).join('|')})\\b`, 'i');
const SHORT_SCAN_PATTERN = new RegExp(`\\b(?:${POK_SHORTS.map(escapeRegex).join('|')})\\b`, 'gi');

export interface PokFinding {
  roomId: number;
  short: string;
  areaId: number;
  areaName: string;
  slain?: boolean;
}

export interface PokState {
  active: boolean;
  findings: PokFinding[];
}

function loadFindings(): PokFinding[] {
  const current = storage.get<unknown>(POK_STORAGE_KEY);
  const legacy = current === null ? storage.get<unknown>(LEGACY_POK_STORAGE_KEY) : null;
  const stored = current ?? legacy;
  if (!Array.isArray(stored)) return [];

  const validFindings = stored.filter((entry): entry is PokFinding => {
    if (!entry || typeof entry !== 'object') return false;
    const finding = entry as Partial<PokFinding>;
    return (
      Number.isInteger(finding.roomId) &&
      typeof finding.short === 'string' &&
      Number.isInteger(finding.areaId) &&
      typeof finding.areaName === 'string' &&
      (finding.slain === undefined || typeof finding.slain === 'boolean')
    );
  });
  const shouldNormalizeWidlogon = validFindings.some((finding) => finding.short === 'Szybki agresywny wildogon');
  const findings = validFindings.map((finding) => (
    finding.short === 'Szybki agresywny wildogon'
      ? { ...finding, short: 'Szybki agresywny widlogon' }
      : finding
  ));

  if ((current === null && legacy !== null) || shouldNormalizeWidlogon) {
    try {
      storage.set(POK_STORAGE_KEY, findings);
      storage.remove(LEGACY_POK_STORAGE_KEY);
    } catch {
      // Keep the loaded legacy data in memory if localStorage is unavailable.
    }
  }

  return findings;
}

export function createPokState(): PokState {
  return { active: false, findings: loadFindings() };
}

function getAreaName(api: PluginApi, areaId: number): string {
  const areas = api.map.getAreas();
  if (!Array.isArray(areas)) return `Obszar ${areaId}`;
  return areas.find((area) => area.areaId === areaId)?.areaName ?? `Obszar ${areaId}`;
}

type FindingHandler = (finding: PokFinding) => void;

interface ListActions {
  preview: FindingHandler;
  leadAndWalk: FindingHandler;
}

interface PendingLocalUpdate {
  roomId: number;
  findingIndex: number;
}

function descriptionWords(description: string): Set<string> {
  return new Set(description.toLowerCase().match(/[a-z]{4,}/g) ?? []);
}

function selectCreatureDescription(currentShort: string, descriptions: string[]): string | null {
  if (descriptions.length === 1) return descriptions[0];

  const currentWords = descriptionWords(currentShort);
  const scored = descriptions.map((description) => ({
    description,
    score: [...descriptionWords(description)].filter((word) => currentWords.has(word)).length,
  }));
  const bestScore = Math.max(0, ...scored.map((candidate) => candidate.score));
  const best = scored.filter((candidate) => candidate.score === bestScore);
  return bestScore > 0 && best.length === 1 ? best[0].description : null;
}

function capitalizeFirst(description: string): string {
  const [first = '', ...rest] = [...description];
  return first.toLocaleUpperCase('pl-PL') + rest.join('');
}

function findFindingIndex(state: PokState, finding: PokFinding): number {
  return state.findings.findIndex(
    (candidate) => candidate.roomId === finding.roomId && candidate.short.toLowerCase() === finding.short.toLowerCase(),
  );
}

function toggleSlain(api: PluginApi, state: PokState, finding: PokFinding, actions: ListActions): void {
  try {
    const index = findFindingIndex(state, finding);
    if (index === -1) return;

    const next = state.findings.map((candidate, candidateIndex) =>
      candidateIndex === index ? { ...candidate, slain: !candidate.slain } : candidate,
    );
    storage.set(POK_STORAGE_KEY, next);
    state.findings.splice(0, state.findings.length, ...next);
    printList(api, state, actions);
  } catch {
    api.output.print('[poko] Nie udalo sie zmienic statusu znaleziska.');
  }
}

function clearSlainStatuses(api: PluginApi, state: PokState, actions: ListActions): void {
  try {
    const next = state.findings.map((finding) => ({ ...finding, slain: false }));
    storage.set(POK_STORAGE_KEY, next);
    state.findings.splice(0, state.findings.length, ...next);
    printList(api, state, actions);
  } catch {
    api.output.print('[poko] Nie udalo sie odznaczyc stworow.');
  }
}

function removeFinding(api: PluginApi, state: PokState, finding: PokFinding, actions: ListActions): void {
  try {
    const index = findFindingIndex(state, finding);
    if (index === -1) return;

    const next = state.findings.filter((_, findingIndex) => findingIndex !== index);
    storage.set(POK_STORAGE_KEY, next);
    state.findings.splice(0, state.findings.length, ...next);
    api.output.print(`[poko] Usunieto #${index + 1}: ${finding.short} (${finding.roomId}).`);
    printList(api, state, actions);
  } catch {
    api.output.print('[poko] Nie udalo sie usunac znaleziska.');
  }
}

function printList(api: PluginApi, state: PokState, actions: ListActions): void {
  if (state.findings.length === 0) {
    api.output.print('[poko] Brak zapisanych stworow.');
    return;
  }

  const currentRoomId = api.map.getRoom()?.id;
  const getDistance = currentRoomId === undefined
    ? () => null
    : createRoomDistanceLookup(api.map, currentRoomId);
  const rows = state.findings
    .map((finding, savedIndex) => ({
      finding,
      savedIndex,
      distance: getDistance(finding.roomId),
    }))
    .sort(
      (left, right) =>
        (left.distance ?? Number.POSITIVE_INFINITY) - (right.distance ?? Number.POSITIVE_INFINITY) ||
        left.savedIndex - right.savedIndex,
    );
  const borderColor = api.colors.fromHex('#777777');
  const idColor = api.colors.fromHex('#2f855a');
  const rowColor = api.colors.fromHex('#929292');
  const completedRowColor = api.colors.fromHex('#484848');
  const currentRowColor = api.colors.fromHex('#6f8f78');
  const completedCurrentRowColor = api.colors.fromHex('#4e6454');
  const aliveMarkerColor = api.colors.fromHex('#777777');
  const deadMarkerColor = api.colors.fromHex('#8f4a4a');
  const completedColor = api.colors.fromHex('#4f8a65');
  const previewColor = api.colors.fromHex('#607d9b');
  const deleteColor = api.colors.fromHex('#8f4a4a');

  printOutputTable({
    api,
    rows,
    borderState: borderColor,
    rowState: ({ finding, distance }) => finding.slain
      ? distance === 0 ? completedCurrentRowColor : completedRowColor
      : distance === 0 ? currentRowColor : rowColor,
    columns: [
      {
        cell: ({ finding }) => ({
          text: String(finding.roomId),
          state: {
            ...idColor,
            underline: true,
            hyperlink: {
              title: `/prowadz ${finding.roomId}`,
              onClick: () => { void api.command.send(`/prowadz ${finding.roomId}`); },
            },
          },
        }),
      },
      {
        align: 'right',
        cell: ({ finding, distance }) => ({
          text: distance === null ? '-' : `${distance} lok.`,
          state: {
            underline: true,
            hyperlink: {
              title: `/prowadz ${finding.roomId}, potem vid`,
              onClick: () => actions.leadAndWalk(finding),
            },
          },
        }),
      },
      { cell: ({ finding }) => ({ text: finding.short }) },
      { cell: ({ finding }) => ({ text: finding.areaName }) },
      {
        cell: ({ finding }) => {
          const isSlain = finding.slain === true;
          return {
            text: isSlain ? '💀' : '  ',
            state: {
              ...(isSlain ? deadMarkerColor : aliveMarkerColor),
              underline: false,
              hyperlink: {
                title: isSlain ? 'Oznacz jako zywego' : 'Oznacz jako ubitego',
                onClick: () => toggleSlain(api, state, finding, actions),
              },
            },
          };
        },
      },
      {
        cell: ({ finding }) => ({
          text: '👁',
          state: {
            ...previewColor,
            hyperlink: {
              title: `Podglad przez 3 sekundy: ${finding.short} (${finding.roomId})`,
              onClick: () => actions.preview(finding),
            },
          },
        }),
      },
      {
        cell: ({ finding }) => ({
          text: '🗑',
          state: {
            ...deleteColor,
            hyperlink: {
              title: `Usun: ${finding.short} (${finding.roomId})`,
              onClick: () => removeFinding(api, state, finding, actions),
            },
          },
        }),
      },
    ],
  });
  const clearButton = new api.AnsiAwareBuffer();
  clearButton.append('[CLEAR]', {
    ...completedColor,
    underline: true,
    hyperlink: {
      title: 'Odznacz wszystkie zabite/odwiedzone stwory',
      onClick: () => clearSlainStatuses(api, state, actions),
    },
  });
  api.output.print(clearButton);
}

function printHelp(api: PluginApi): void {
  const commandColor = api.colors.fromHex('#7dd3fc');
  const borderColor = api.colors.fromHex('#4b5563');
  const rows = [
    ['poko+', 'wlacz wyszukiwanie i zapisywanie stworow'],
    ['poko-', 'wylacz wyszukiwanie'],
    ['poko / poko_lista', 'pokaz zapisane stwory i odleglosci'],
    ['poko_tu', 'odswiez opis stwora w biezacej lokacji'],
    ['poko_reset', 'usun wszystkie zapisane stwory'],
    ['poko_help', 'pokaz ten help'],
    ['ID lokacji', 'kliknij, aby wykonac /prowadz'],
    ['odleglosc', 'kliknij, aby wykonac /prowadz, potem vid'],
    ['puste / \ud83d\udc80', 'oznacz stwora jako zywego / ubitego'],
    ['\ud83d\udc41', 'pokaz lokacje na mapie przez 3 sekundy'],
    ['\ud83d\uddd1', 'usun pojedynczy wpis'],
    ['CLEAR', 'oznacz wszystkie ubite stwory jako zywe'],
  ] as const;
  const commandWidth = Math.max(...rows.map(([command]) => command.length));
  const lineWidth = Math.max(...rows.map(([command, description]) => commandWidth + 2 + description.length));

  const printBorder = (text: string) => {
    const buffer = new api.AnsiAwareBuffer(text);
    buffer.color([0, text.length], borderColor);
    api.output.print(buffer);
  };

  printBorder('\u2500'.repeat(lineWidth));
  printBorder(' POKONIUCHY');
  printBorder('\u2500'.repeat(lineWidth));
  for (const [command, description] of rows) {
    const line = `${command.padEnd(commandWidth)}  ${description}`;
    const buffer = new api.AnsiAwareBuffer(line);
    buffer.color([0, command.length], commandColor);
    api.output.print(buffer);
  }
  printBorder('\u2500'.repeat(lineWidth));
}

function saveFinding(api: PluginApi, state: PokState, short: string): void {
  const room = api.map.getRoom();
  if (!room) {
    api.output.print(`[poko] Znaleziono: ${short}, ale mapa nie zna biezacej lokacji.`);
    return;
  }

  const duplicate = state.findings.some(
    (finding) => finding.roomId === room.id && finding.short.toLowerCase() === short.toLowerCase(),
  );
  if (duplicate) return;

  const finding: PokFinding = {
    roomId: room.id,
    short,
    areaId: room.area,
    areaName: getAreaName(api, room.area),
  };
  state.findings.push(finding);
  storage.set(POK_STORAGE_KEY, state.findings);
  api.output.print(`[poko] #${state.findings.length}: ${short} (${room.id}, ${finding.areaName})`);
}

export function setupPok(api: PluginApi, triggerTag = POK_TAG): () => void {
  const state = createPokState();
  const mapPreview = createMapPreviewController(api, {
    durationMs: 3_000,
    missingRoomMessage: '[poko] Nie mozna uruchomic podgladu: mapa nie zna biezacej lokacji.',
  });
  let leadAndWalkTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingLocalUpdate: PendingLocalUpdate | null = null;
  let localUpdateTimer: ReturnType<typeof setTimeout> | null = null;

  const preview: FindingHandler = (finding) => mapPreview.preview(finding.roomId);

  const leadAndWalk: FindingHandler = (finding) => {
    if (leadAndWalkTimer !== null) clearTimeout(leadAndWalkTimer);
    void api.command.send(`/prowadz ${finding.roomId}`);
    leadAndWalkTimer = setTimeout(() => {
      leadAndWalkTimer = null;
      runVid(api);
    }, 500);
  };

  const listActions: ListActions = { preview, leadAndWalk };

  const clearPendingLocalUpdate = () => {
    pendingLocalUpdate = null;
    if (localUpdateTimer !== null) clearTimeout(localUpdateTimer);
    localUpdateTimer = null;
  };

  const applyPendingLocalUpdate = (description: string): boolean => {
    const pending = pendingLocalUpdate;
    if (!pending) return false;

    const currentRoomId = api.map.getRoom()?.id;
    const finding = state.findings[pending.findingIndex];
    if (currentRoomId !== pending.roomId || !finding || finding.roomId !== pending.roomId) {
      clearPendingLocalUpdate();
      api.output.print('[poko] Lokacja zmienila sie przed odczytaniem stwora.');
      return false;
    }

    clearPendingLocalUpdate();
    const previousShort = finding.short;
    const normalizedDescription = capitalizeFirst(description);
    const next = state.findings.map((candidate, index) => (
      index === pending.findingIndex ? { ...candidate, short: normalizedDescription } : candidate
    ));
    try {
      storage.set(POK_STORAGE_KEY, next);
      state.findings.splice(0, state.findings.length, ...next);
      printList(api, state, listActions);
      api.output.print(`[poko] Wpis zostal nadpisany: ${previousShort} -> ${normalizedDescription}.`);
      return true;
    } catch {
      api.output.print('[poko] Nie udalo sie zapisac nowego opisu.');
      return false;
    }
  };

  const onParsedObjects = () => {
    const pending = pendingLocalUpdate;
    if (!pending) return;

    const currentRoomId = api.map.getRoom()?.id;
    const finding = state.findings[pending.findingIndex];
    if (currentRoomId !== pending.roomId || !finding || finding.roomId !== pending.roomId) {
      clearPendingLocalUpdate();
      api.output.print('[poko] Lokacja zmienila sie przed odczytaniem stwora.');
      return;
    }

    const descriptions = api.objects.getObjectsOnLocation()
      .filter((object) => object.__category === 'rest' || object.__category === 'rest-noncombat')
      .map((object) => object.desc?.trim())
      .filter((description): description is string => Boolean(description));
    const description = selectCreatureDescription(finding.short, descriptions);
    if (description) applyPendingLocalUpdate(description);
  };

  api.events.on('parsedObjects', onParsedObjects);

  registerTokenGate(
    api,
    GATE_WORDS,
    SHORT_PATTERN,
    (line, _matches, _type, originalLine) => {
      // Trigger callbacks must never leak errors into the client's output batch.
      try {
        const text = originalLine ?? line.text;
        SHORT_SCAN_PATTERN.lastIndex = 0;
        const foundShorts: string[] = [];
        let match: RegExpExecArray | null;
        while ((match = SHORT_SCAN_PATTERN.exec(text)) !== null) {
          const canonical = POK_SHORTS.find((candidate) => candidate.toLowerCase() === match![0].toLowerCase());
          if (canonical) foundShorts.push(canonical);
        }

        if (pendingLocalUpdate && foundShorts.length === 1) {
          applyPendingLocalUpdate(foundShorts[0]);
        }
        if (state.active) {
          for (const canonical of foundShorts) saveFinding(api, state, canonical);
        }
      } catch {
        // Searching should never interrupt processing the remaining game output.
      }
      return line;
    },
    triggerTag,
  );

  api.aliases.register(/^poko\+$/i, () => {
    state.active = true;
    api.output.print(`[poko] Szukanie wlaczone. Zapisano dotad: ${state.findings.length}.`);
    return true;
  });

  api.aliases.register(/^poko-$/i, () => {
    state.active = false;
    api.output.print('[poko] Szukanie wylaczone.');
    return true;
  });

  api.aliases.register(/^(?:poko_lista|poko)$/i, () => {
    printList(api, state, listActions);
    return true;
  });

  api.aliases.register(/^poko_tu$/i, () => {
    const roomId = api.map.getRoom()?.id;
    if (roomId === undefined) {
      api.output.print('[poko] Mapa nie zna biezacej lokacji.');
      return true;
    }

    const matchingIndexes = state.findings
      .map((finding, index) => finding.roomId === roomId ? index : -1)
      .filter((index) => index !== -1);
    if (matchingIndexes.length === 0) {
      api.output.print('[poko] Brak zapisanego stwora na tej lokacji.');
      return true;
    }
    if (matchingIndexes.length > 1) {
      api.output.print('[poko] Na tej lokacji jest kilka zapisanych wpisow.');
      return true;
    }

    clearPendingLocalUpdate();
    pendingLocalUpdate = { roomId, findingIndex: matchingIndexes[0] };
    localUpdateTimer = setTimeout(() => {
      pendingLocalUpdate = null;
      localUpdateTimer = null;
      api.output.print('[poko] Nie otrzymano listy stworow po komendzie zerknij.');
    }, 5000);
    void api.command.send('zerknij');
    return true;
  });

  api.aliases.register(/^poko_reset$/i, () => {
    storage.remove(POK_STORAGE_KEY);
    state.findings.splice(0, state.findings.length);
    api.output.print('[poko] Lista zostala wyzerowana.');
    return true;
  });

  api.aliases.register(/^poko_help$/i, () => {
    printHelp(api);
    return true;
  });

  return () => {
    mapPreview.dispose();
    if (leadAndWalkTimer !== null) clearTimeout(leadAndWalkTimer);
    clearPendingLocalUpdate();
    api.events.off('parsedObjects', onParsedObjects);
  };
}
