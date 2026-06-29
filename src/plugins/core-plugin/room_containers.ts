import type { PluginApi } from '@arkadia/plugin-types';
import { storage } from '../../lib/storage';

// Per-room container override, replacing the old MUD `tupojemnik` StringList
// variable. The old script kept a room-scoped variable holding two Polish forms
// of the container noun (mianownik|dopelniacz, e.g. "kufer|kufra"); here we map
// the map room id to that pair and persist it in localStorage.
//
//   pj  [text]  -> otworz <nominative>; przejrzyj <text>
//   we  [text]  -> otworz <nominative>; wez <text> z <genitive>
//   wl  [text]  -> otworz <nominative>; wloz <text> do <genitive>
//
// When the current room has no override we fall back to the default chest
// (formerly the `obecny_pojemnik` variable, default "skrzynie").

const STORAGE_KEY = 'roomContainers';

// [nominative, genitive] — e.g. ["kufer", "kufra"]
type Container = [string, string];
type ContainerMap = Record<string, Container>;

// Default container (old `obecny_pojemnik` = "skrzynie", genitive "skrzyni").
const DEFAULT_CONTAINER: Container = ['skrzynie', 'skrzyni'];

function loadContainers(): ContainerMap {
  return storage.get<ContainerMap>(STORAGE_KEY) ?? {};
}

function saveContainers(map: ContainerMap): void {
  storage.set(STORAGE_KEY, map);
}

export function setupRoomContainers(api: PluginApi): void {
  const containers = loadContainers();

  const currentRoomKey = (): string | undefined => {
    const id = api.map.getRoom()?.id;
    return id != null ? String(id) : undefined;
  };

  // Resolve the container for the current room, falling back to the default.
  const containerFor = (): Container => {
    const key = currentRoomKey();
    return (key && containers[key]) || DEFAULT_CONTAINER;
  };

  // pj [text] — open the room's container, then przejrzyj (look through it).
  api.aliases.register(/^pj(?:\s+(.+))?$/, (matches) => {
    const [nom] = containerFor();
    api.command.send(`otworz ${nom}`);
    const text = matches?.[1]?.trim();
    api.command.send(text ? `przejrzyj ${text}` : 'przejrzyj');
    return true;
  });

  // we [text] — open the room's container, then take <text> out of it.
  api.aliases.register(/^we(?:\s+(.+))?$/, (matches) => {
    const text = matches?.[1]?.trim();
    if (!text) return true;
    const [nom, gen] = containerFor();
    api.command.send(`otworz ${nom}`);
    api.command.send(`wez ${text} z ${gen}`);
    return true;
  });

  // wl [text] — open the room's container, then put <text> into it.
  api.aliases.register(/^wl(?:\s+(.+))?$/, (matches) => {
    const text = matches?.[1]?.trim();
    if (!text) return true;
    const [nom, gen] = containerFor();
    api.command.send(`otworz ${nom}`);
    api.command.send(`wloz ${text} do ${gen}`);
    return true;
  });

  // pj+ <mianownik>|<dopelniacz> — bind a container to the current room.
  // e.g. `pj+ kufer|kufra`. A single form is reused for both cases.
  api.aliases.register(/^pj\+\s+(.+)$/, (matches) => {
    const key = currentRoomKey();
    if (!key) {
      api.output.print('[pj] nieznany pokoj (mapa niezaladowana) — nie zapisano');
      return true;
    }
    const parts = matches![1]
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      api.output.print('[pj] uzycie: pj+ <mianownik>|<dopelniacz>');
      return true;
    }
    const nom = parts[0];
    const gen = parts[1] ?? parts[0];
    containers[key] = [nom, gen];
    saveContainers(containers);
    api.output.print(`[pj] pokoj ${key}: ${nom} | ${gen}`);
    return true;
  });

  // pj- — remove the current room's container (revert to the default chest).
  api.aliases.register(/^pj-$/, () => {
    const key = currentRoomKey();
    if (!key || !containers[key]) {
      api.output.print('[pj] ten pokoj nie ma przypisanego pojemnika');
      return true;
    }
    delete containers[key];
    saveContainers(containers);
    api.output.print(`[pj] usunieto pojemnik dla pokoju ${key}`);
    return true;
  });

  // pj? — show the container resolved for the current room.
  api.aliases.register(/^pj\?$/, () => {
    const key = currentRoomKey();
    const [nom, gen] = containerFor();
    const custom = key && containers[key] ? '' : ' (domyslny)';
    api.output.print(`[pj] pokoj ${key ?? '?'}: ${nom} | ${gen}${custom}`);
    return true;
  });
}
