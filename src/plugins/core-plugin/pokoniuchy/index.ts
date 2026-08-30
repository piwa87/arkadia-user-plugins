import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';
import { escapeRegex } from '../../../lib/escapeRegex';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { storage } from '../../../lib/storage';

export const POK_TAG = 'pokoniuchy';
export const POK_STORAGE_KEY = 'pokoniuchy:findings';
const LEGACY_POK_STORAGE_KEY = 'mod_pok:findings';

// Shorty widoczne w dostarczonej tabeli. Kolejne odmiany mozna dopisywac tutaj.
export const POK_SHORTS = [
  'Galezowaty pokoniunkcyjny klabart',
  'Pokoniunkcyjny glazowy stwor',
  'Wezowaty grozny stwor',
  'Pospolita wezowata wiwerna',
  'Szybki agresywny wildogon',
  'Duza drapiezna endriaga',
  'Duza zwinna endriaga',
  'Wielki skrzydlaty oszluzg',
  'Potezna skrzydlata bestia',
  'Omszala jadowita kergulena',
] as const;

const GATE_WORDS = ['klabart', 'stwor', 'wiwerna', 'wildogon', 'endriaga', 'oszluzg', 'bestia', 'kergulena'];
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

  const findings = stored.filter((entry): entry is PokFinding => {
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

  if (current === null && legacy !== null) {
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

function distanceFromCurrent(api: PluginApi, roomId: number): string {
  const currentId = api.map.getRoom()?.id;
  if (currentId === undefined) return '-';
  if (currentId === roomId) return '0';

  const path = api.map.findPath(currentId, roomId);
  return path ? String(Math.max(0, path.length - 1)) : '-';
}

type PreviewHandler = (finding: PokFinding) => void;

function findFindingIndex(state: PokState, finding: PokFinding): number {
  return state.findings.findIndex(
    (candidate) => candidate.roomId === finding.roomId && candidate.short.toLowerCase() === finding.short.toLowerCase(),
  );
}

function toggleSlain(api: PluginApi, state: PokState, finding: PokFinding, preview: PreviewHandler): void {
  try {
    const index = findFindingIndex(state, finding);
    if (index === -1) return;

    const next = state.findings.map((candidate, candidateIndex) =>
      candidateIndex === index ? { ...candidate, slain: !candidate.slain } : candidate,
    );
    storage.set(POK_STORAGE_KEY, next);
    state.findings.splice(0, state.findings.length, ...next);
    printList(api, state, preview);
  } catch {
    api.output.print('[poko] Nie udalo sie zmienic statusu znaleziska.');
  }
}

function removeFinding(api: PluginApi, state: PokState, finding: PokFinding, preview: PreviewHandler): void {
  try {
    const index = findFindingIndex(state, finding);
    if (index === -1) return;

    const next = state.findings.filter((_, findingIndex) => findingIndex !== index);
    storage.set(POK_STORAGE_KEY, next);
    state.findings.splice(0, state.findings.length, ...next);
    api.output.print(`[poko] Usunieto #${index + 1}: ${finding.short} (${finding.roomId}).`);
    printList(api, state, preview);
  } catch {
    api.output.print('[poko] Nie udalo sie usunac znaleziska.');
  }
}

function printList(api: PluginApi, state: PokState, preview: PreviewHandler): void {
  if (state.findings.length === 0) {
    api.output.print('[poko] Brak zapisanych stworow.');
    return;
  }

  const orderedRows = state.findings
    .map((finding, savedIndex) => ({
      finding,
      savedIndex,
      distance: distanceFromCurrent(api, finding.roomId),
    }))
    .sort((left, right) => {
      const leftDistance = left.distance === '-' ? Number.POSITIVE_INFINITY : Number(left.distance);
      const rightDistance = right.distance === '-' ? Number.POSITIVE_INFINITY : Number(right.distance);
      return leftDistance - rightDistance || left.savedIndex - right.savedIndex;
    });
  const findings = orderedRows.map((row) => row.finding);
  const distances = orderedRows.map((row) => row.distance);

  const nrWidth = Math.max(2, String(findings.length).length);
  const idWidth = Math.max(2, ...findings.map((finding) => String(finding.roomId).length));
  const distanceWidth = Math.max(4, ...distances.map((distance) => distance.length));
  const shortWidth = Math.max(
    'SHORT STWORA POKONIUNKCYJNEGO'.length,
    ...findings.map((finding) => finding.short.length),
  );
  const areaWidth = Math.max('MAPA / OBSZAR'.length, ...findings.map((finding) => finding.areaName.length));
  const checkWidth = 3;
  const actionWidth = 2;

  const border = `+${'-'.repeat(nrWidth + 2)}+${'-'.repeat(idWidth + 2)}+${'-'.repeat(distanceWidth + 2)}+${'-'.repeat(shortWidth + 2)}+${'-'.repeat(areaWidth + 2)}+${'-'.repeat(checkWidth + 2)}+${'-'.repeat(actionWidth + 2)}+${'-'.repeat(actionWidth + 2)}+`;
  const header = `| ${'NR'.padEnd(nrWidth)} | ${'LOC'.padEnd(idWidth)} | ${'DIS'.padEnd(distanceWidth)} | ${'SHORT'.padEnd(shortWidth)} | ${' '.padEnd(areaWidth)} | ${' '.repeat(checkWidth)} | ${' '.repeat(actionWidth)} | ${' '.repeat(actionWidth)} |`;
  const borderColor = api.colors.fromHex('#777777');
  const headerColor = api.colors.fromHex('#b86b18');
  const idColor = api.colors.fromHex('#2f855a');
  const rowColor = api.colors.fromHex('#929292');
  const completedRowColor = api.colors.fromHex('#484848');
  const currentRowColor = api.colors.fromHex('#6f8f78');
  const completedCurrentRowColor = api.colors.fromHex('#4e6454');
  const pendingColor = api.colors.fromHex('#777777');
  const completedColor = api.colors.fromHex('#4f8a65');
  const previewColor = api.colors.fromHex('#607d9b');
  const deleteColor = api.colors.fromHex('#8f4a4a');

  const printColored = (text: string, color: FormatStateSnapshot) => {
    const buffer = new api.AnsiAwareBuffer(text);
    buffer.color([0, text.length], color);
    api.output.print(buffer);
  };

  printColored(border, borderColor);
  printColored(header, headerColor);
  printColored(border, borderColor);

  findings.forEach((finding, index) => {
    const buffer = new api.AnsiAwareBuffer();
    const roomId = String(finding.roomId);
    const isCurrentRoom = distances[index] === '0';
    const dataColor = finding.slain
      ? isCurrentRoom
        ? completedCurrentRowColor
        : completedRowColor
      : isCurrentRoom
        ? currentRowColor
        : rowColor;
    buffer.append(`| ${String(index + 1).padStart(nrWidth)} | `, dataColor);
    buffer.append(roomId, {
      ...idColor,
      underline: true,
      hyperlink: {
        title: `/prowadz ${finding.roomId}`,
        onClick: () => {
          void api.command.send(`/prowadz ${finding.roomId}`);
        },
      },
    });
    // Pass an explicit non-link state after the ID. Without it the client's
    // buffer carries the hyperlink format into the rest of the row.
    buffer.append(
      `${' '.repeat(idWidth - roomId.length)} | ${distances[index].padStart(distanceWidth)} | ${finding.short.padEnd(shortWidth)} | ${finding.areaName.padEnd(areaWidth)} | `,
      dataColor,
    );
    const checkIcon = finding.slain ? '[✓]' : '[ ]';
    buffer.append(checkIcon, {
      ...(finding.slain ? completedColor : pendingColor),
      hyperlink: {
        title: finding.slain ? 'Oznacz jako nieodwiedzone' : 'Oznacz jako zabite/odwiedzone',
        onClick: () => toggleSlain(api, state, finding, preview),
      },
    });
    buffer.append(`${' '.repeat(checkWidth - checkIcon.length)} | `, dataColor);
    buffer.append('👁', {
      ...previewColor,
      hyperlink: {
        title: `Podglad przez 3 sekundy: ${finding.short} (${finding.roomId})`,
        onClick: () => preview(finding),
      },
    });
    buffer.append(`${' '.repeat(actionWidth - '👁'.length)} | `, dataColor);
    buffer.append('🗑', {
      ...deleteColor,
      hyperlink: {
        title: `Usun: ${finding.short} (${finding.roomId})`,
        onClick: () => removeFinding(api, state, finding, preview),
      },
    });
    buffer.append(`${' '.repeat(actionWidth - '🗑'.length)} |`, dataColor);
    api.output.print(buffer);
  });

  printColored(border, borderColor);
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

export function setupPok(api: PluginApi): () => void {
  const state = createPokState();
  let previewTimer: ReturnType<typeof setTimeout> | null = null;
  let previewOriginId: number | null = null;

  const finishPreview = () => {
    const originId = previewOriginId;
    previewTimer = null;
    previewOriginId = null;
    if (originId !== null) void api.command.send(`/ustaw ${originId}`);
  };

  const preview: PreviewHandler = (finding) => {
    if (previewTimer === null) {
      const currentId = api.map.getRoom()?.id;
      if (currentId === undefined) {
        api.output.print('[poko] Nie mozna uruchomic podgladu: mapa nie zna biezacej lokacji.');
        return;
      }
      previewOriginId = currentId;
    } else {
      clearTimeout(previewTimer);
    }

    void api.command.send(`/ustaw ${finding.roomId}`);
    previewTimer = setTimeout(finishPreview, 3000);
  };

  registerTokenGate(
    api,
    GATE_WORDS,
    SHORT_PATTERN,
    (line, _matches, _type, originalLine) => {
      if (!state.active) return line;

      // Trigger callbacks must never leak errors into the client's output batch.
      try {
        const text = originalLine ?? line.text;
        SHORT_SCAN_PATTERN.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = SHORT_SCAN_PATTERN.exec(text)) !== null) {
          const canonical = POK_SHORTS.find((candidate) => candidate.toLowerCase() === match![0].toLowerCase());
          if (canonical) saveFinding(api, state, canonical);
        }
      } catch {
        // Searching should never interrupt processing the remaining game output.
      }
      return line;
    },
    POK_TAG,
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
    printList(api, state, preview);
    return true;
  });

  api.aliases.register(/^poko_reset$/i, () => {
    storage.remove(POK_STORAGE_KEY);
    state.findings.splice(0, state.findings.length);
    api.output.print('[poko] Lista zostala wyzerowana.');
    return true;
  });

  return () => {
    if (previewTimer !== null) clearTimeout(previewTimer);
    finishPreview();
  };
}
