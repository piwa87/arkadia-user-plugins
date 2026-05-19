import type { PluginApi } from '@arkadia/plugin-types';

interface Keygiver {
  id?: string;
  name: string;
  short: string;
  location_id?: number;
  locations?: Array<{ locationId: number; name: string }>;
  area?: string;
  respawnTime?: number;
  respawn_hours?: number;
  playersToComplete?: number;
}

interface KeygiverDrop {
  keyGiver?: { name: string };
  keygiver_name?: string;
  killed_at?: number;
  dropDate?: number;
  nextRespawnDate?: number;
  drop?: { name: string } | string;
}

interface RaState {
  keygivers: Keygiver[];
  keygiverDrops: KeygiverDrop[];
  keys: Array<{ name: string; domain: string }>;
  debug?: boolean;
  api?: any;
  webhooks?: { [key: string]: string };
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

function pad2(str: string | undefined, len: number): string {
  return (str || '')
    .substring(0, len)
    .padEnd(len);
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  } as any);
}

function parseDate(str: string): number | null {
  const match = str.match(/(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) return null;
  const d = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5])
  );
  return Math.floor(d.getTime() / 1000);
}

function getKeyDomain(state: RaState, keyName: string): string {
  for (const key of state.keys) {
    if (key.name === keyName) return key.domain || '';
  }
  return '';
}

function colorKeygivers(api: PluginApi, state: RaState): any {
  if (state.keygivers.length === 0) return null;
  const highlighter = api.map.createHighlighter({ color: '#ff0000' });
  const roomIds: number[] = [];
  const notesByRoom = new Map<number, string[]>();

  for (const kg of state.keygivers) {
    const locations = Array.isArray(kg.locations) ? kg.locations : [];
    if (locations.length === 0 && kg.location_id) {
      locations.push({ locationId: kg.location_id, name: '' });
    }

    for (const loc of locations) {
      const roomId = loc.locationId;
      if (!roomId) continue;
      roomIds.push(roomId);
      const notes = notesByRoom.get(roomId) || [];
      const resp = kg.respawnTime ?? kg.respawn_hours ?? '?';
      const players = kg.playersToComplete ?? 1;
      notes.push(`${kg.name} (resp: ${resp}h, os: ${players})`);
      notesByRoom.set(roomId, notes);
    }
  }

  if (roomIds.length > 0) {
    highlighter.add(roomIds);
  }

  for (const [roomId, notes] of notesByRoom) {
    api.locationNotes.set(roomId, notes.join(', '));
  }

  return highlighter;
}

function printKeygivers(
  api: PluginApi,
  state: RaState,
  params: string,
  showAll: boolean
): void {
  if (state.keygivers.length === 0) {
    cecho(
      api,
      "\n<yellow>Brak danych o kluczodajkach. Uzyj /ra_pobierz_dane_online\n"
    );
    return;
  }

  const isSearch = params && isNaN(Number(params));
  const maxSteps = isSearch ? Infinity : params ? Number(params) : 150;
  const searchStr = isSearch ? params.toLowerCase() : '';

  if (isSearch) {
    cecho(api, `
<white>Kluczodajki szukane po ${params}:
`);
  } else if (showAll) {
    cecho(api, '\n<white>Wszystkie znane kluczodajki:\n');
  } else {
    cecho(api, `
<white>Kluczodajki w odleglosci ${maxSteps} krokow:
`);
  }

  const totalWidth = 110;
  cecho(api, `
${'-'.repeat(totalWidth)}`);
  cecho(api, `
<yellow> ${pad2('Kluczodajka', 29)} ${pad2('Opis', 35)} ${pad2('Resp(h)', 8)} ${pad2('#', 4)} ${pad2('Lokacja', 30)}`);
  cecho(api, `
${'-'.repeat(totalWidth)}`);

  const results: Array<{
    kg: Keygiver;
    locName: string;
    locId: number;
  }> = [];

  for (const kg of state.keygivers) {
    const name = kg.name || '';
    const short = kg.short || '';
    if (isSearch) {
      if (
        !name.toLowerCase().includes(searchStr) &&
        !short.toLowerCase().includes(searchStr)
      )
        continue;
    }

    const locations = kg.locations;
    if (Array.isArray(locations)) {
      for (const loc of locations) {
        results.push({ kg, locName: loc.name || '', locId: loc.locationId || 0 });
      }
    } else {
      results.push({ kg, locName: kg.area || '', locId: kg.location_id || 0 });
    }
  }

  for (const r of results) {
    const kg = r.kg;
    const resp = kg.respawnTime ?? kg.respawn_hours ?? '';
    const players = kg.playersToComplete ?? 1;
    cecho(api, `
<green> ${pad2(kg.name || '', 29)} <MediumSeaGreen>${pad2(kg.short || '', 35)} <green>${pad2(String(resp), 8)} ${pad2(String(players), 4)} <ansi_light_cyan>${pad2(r.locName, 30)}`);
  }

  cecho(api, `
${'-'.repeat(totalWidth)}
`);
}

function printDrops(
  api: PluginApi,
  state: RaState,
  maxHours: number,
  showNext: boolean
): void {
  if (state.keygiverDrops.length === 0) {
    cecho(api, "\n<yellow>Brak danych o dropach.\n");
    return;
  }

  const now = Date.now() / 1000;
  if (showNext) {
    cecho(api, `
<white>Kluczodajki dostepne w nastepnych ${maxHours} h od teraz:
`);
  } else {
    cecho(api, `
<white>Dropy z ostatnich ${maxHours} h:
`);
  }

  const totalWidth = 110;
  cecho(api, `
${'-'.repeat(totalWidth)}`);
  cecho(api, `
<yellow> ${pad2('Data zabicia', 18)} ${pad2('Nast. Resp', 18)} ${pad2('Kluczodajka', 29)} ${pad2('Drop', 43)}`);
  cecho(api, `
${'-'.repeat(totalWidth)}`);

  const entries: Array<{
    dropDate: number;
    respDate: number;
    name: string;
    drop: string;
  }> = [];

  for (const d of state.keygiverDrops) {
    const dropDate = Number(d.killed_at || d.dropDate || 0);
    const respDate = Number(d.nextRespawnDate || 0);
    const name = d.keyGiver?.name || d.keygiver_name || '';
    const drop =
      typeof d.drop === 'object' ? d.drop?.name || '' : String(d.drop || '');

    if (showNext) {
      if (respDate >= now - 86400 && respDate <= now + maxHours * 3600) {
        entries.push({ dropDate, respDate, name, drop });
      }
    } else {
      if (dropDate <= now && dropDate >= now - maxHours * 3600) {
        entries.push({ dropDate, respDate, name, drop });
      }
    }
  }

  entries.sort((a, b) =>
    showNext ? a.respDate - b.respDate : a.dropDate - b.dropDate
  );

  for (const e of entries) {
    const dateStr = formatDate(e.dropDate);
    const respStr = e.respDate > 0 ? formatDate(e.respDate) : '';
    cecho(api, `
<green> ${pad2(dateStr, 18)} <ansi_light_cyan>${pad2(respStr, 18)} <green>${pad2(e.name, 29)} ${pad2(e.drop, 43)}`);
  }

  cecho(api, `
${'-'.repeat(totalWidth)}
`);
}

function printKeyTimes(api: PluginApi, state: RaState, pastDays: number): void {
  if (state.keygiverDrops.length === 0) {
    cecho(api, "\n<yellow>Brak danych o dropach.\n");
    return;
  }

  const now = Date.now() / 1000;
  const entries: Array<{
    validity: number;
    keyName: string;
    domain: string;
    color: string;
  }> = [];

  for (const d of state.keygiverDrops) {
    const drop = d.drop;
    if (typeof drop !== 'object' || !drop) continue;

    const keyName = drop.name || '';
    const dropDate = Number(d.dropDate || d.killed_at || 0);
    const validity = dropDate + 5 * 86400;
    const daysLeft = (validity - now) / 86400;

    if (daysLeft > -pastDays) {
      let color: string;
      if (daysLeft > 3) color = 'grey';
      else if (daysLeft > 2) color = 'green';
      else if (daysLeft > 1) color = 'yellow';
      else if (daysLeft > 0) color = 'orange';
      else color = 'tomato';

      const domain = getKeyDomain(state, keyName);
      entries.push({ validity, keyName, domain, color });
    }
  }

  entries.sort((a, b) => a.validity - b.validity);

  const totalWidth = 116;
  cecho(api, `
${'-'.repeat(totalWidth)}`);
  cecho(api, `
<yellow> ${pad2('Klucz', 75)} ${pad2('Waznosc', 29)} ${pad2('Domena', 10)}`);
  cecho(api, `
${'-'.repeat(totalWidth)}`);

  for (const e of entries) {
    cecho(api, `
<${e.color}> ${pad2(e.keyName, 75)} ${pad2(formatDate(e.validity), 29)} ${pad2(e.domain, 10)}`);
  }

  cecho(api, `
${'-'.repeat(totalWidth)}
`);
}

async function addKeygiverDrop(
  api: PluginApi,
  state: RaState,
  data: string
): Promise<void> {
  const parts = data.split('#');
  const keygiverName = parts[0]?.trim() || '';
  const dropName = parts.length > 1 ? parts[1]?.trim() : '';
  const dateStr = parts.length > 2 ? parts[2]?.trim() : '';

  if (!keygiverName) {
    cecho(api, "\n<tomato>Podaj nazwe kluczodajki.\n");
    return;
  }

  const kg = state.keygivers.find((k) => k.name === keygiverName);
  if (!kg) {
    cecho(api, `
<yellow>Nie znaleziono kluczodajki o nazwie: ${keygiverName}
`);
    return;
  }

  const dropDate = dateStr
    ? parseDate(dateStr)
    : Math.floor(Date.now() / 1000);
  if (!dropDate) {
    cecho(
      api,
      "\n<tomato>Blad w formacie daty. Poprawny przyklad: 2023.07.31 20:19\n"
    );
    return;
  }

  const body: any = {
    keyGiver: kg.id || kg.name,
    dropDate
  };

  if (dropName) {
    const key = state.keys.find((k) => k.name === dropName);
    if (key) {
      body.drop = key.name || dropName;
    } else {
      cecho(api, `
<yellow>Nie znaleziono dropu o nazwie: ${dropName}
`);
      return;
    }
  }

  cecho(api, "\n<green>Uaktualniono dropy.\n");
}

export function setupKeygivers(api: PluginApi, state: RaState): () => void {
  let highlighter: any = null;

  api.aliases.register(/^\/klucze!$/, () => {
    printKeygivers(api, state, '', true);
    return true;
  });

  api.aliases.register(/^\/klucze\s*(.*)$/, (matches: any) => {
    const params = matches?.[1]?.trim() || '';
    printKeygivers(api, state, params, false);
    return true;
  });

  api.aliases.register(/^\/klucze_zabici$/, () => {
    printDrops(api, state, 24, false);
    return true;
  });

  api.aliases.register(/^\/klucze_zabici7$/, () => {
    printDrops(api, state, 24 * 7, false);
    return true;
  });

  api.aliases.register(/^\/klucze_nastepne$/, () => {
    printDrops(api, state, 24, true);
    return true;
  });

  api.aliases.register(/^\/klucze_nastepne7$/, () => {
    printDrops(api, state, 24 * 7, true);
    return true;
  });

  api.aliases.register(/^\/klucze_szukaj\s+(.+)$/, (matches: any) => {
    const search = matches?.[1]?.trim() || '';
    if (search) printKeygivers(api, state, search, true);
    return true;
  });

  api.aliases.register(/^\/klucze_dodaj\s+(.+)$/, (matches: any) => {
    const data = matches?.[1]?.trim() || '';
    addKeygiverDrop(api, state, data);
    return true;
  });

  api.aliases.register(/^\/klucze_lista$/, () => {
    printKeyTimes(api, state, 7);
    return true;
  });

  return () => {
    if (highlighter) {
      highlighter.destroy();
    }
  };
}
