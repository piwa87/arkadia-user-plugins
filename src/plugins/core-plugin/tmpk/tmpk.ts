import type { PluginApi } from '@arkadia/plugin-types';
import { storage } from '../../../lib/storage';

const TAG = 'tmpk';
const STORAGE_KEY = 'tmpk';

const DEFAULT_LIST = [
  'bagiennik',
  'czarny ork',
  'harpia',
  'hobgoblin',
  'kosciotrup',
  'mutant',
  'ozywieniec',
  'potwor',
  'reptilion',
  'skaven',
  'szkielet',
  'troglodyta',
  'troll',
  'wietrzyca',
  'wiwerna',
  'wyverna',
  'zjawa',
  'zombi',
  'zwierzoczlek',
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPattern(list: string[]): RegExp {
  return new RegExp('\\b(?:' + list.map(escapeRegex).join('|') + ')\\b', 'i');
}

export interface TmpkState {
  list: string[];
}

export function createTmpkState(): TmpkState {
  return { list: storage.get<string[]>(STORAGE_KEY) ?? [...DEFAULT_LIST] };
}

function registerTrigger(api: PluginApi, state: TmpkState, color: unknown): void {
  if (state.list.length === 0) return;
  api.triggers.register(
    buildPattern(state.list),
    (line) => {
      const re = new RegExp('\\b(?:' + state.list.map(escapeRegex).join('|') + ')\\b', 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec((line as any).text)) !== null) {
        (line as any).color([m.index, m.index + m[0].length], color);
      }
      return line;
    },
    TAG,
  );
}

export function setupTmpk(api: PluginApi): void {
  const state = createTmpkState();
  const color = api.colors.fromHex('#8c540f');

  registerTrigger(api, state, color);

  const persist = (list: string[]) => {
    state.list = list;
    storage.set(STORAGE_KEY, list);
    api.triggers.removeByTag(TAG);
    registerTrigger(api, state, color);
  };

  api.aliases.register(/^tmpk$/, () => {
    if (state.list.length === 0) {
      api.output.print('[tmpk] (pusta lista)');
    } else {
      api.output.print('[tmpk] ' + state.list.join(', '));
    }
    return true;
  });

  api.aliases.register(/^tmpk\+\s+(.+)$/, (matches) => {
    const name = matches![1].trim().toLowerCase();
    if (state.list.includes(name)) {
      api.output.print(`[tmpk] juz jest: ${name}`);
      return true;
    }
    persist([...state.list, name]);
    api.output.print(`[tmpk] dodano: ${name}`);
    return true;
  });

  // tmpk- [name] — remove named item, or last item when no arg
  api.aliases.register(/^tmpk-(?:\s+(.+))?$/, (matches) => {
    const name = matches?.[1]?.trim().toLowerCase();
    const target = name ?? state.list[state.list.length - 1];
    if (!target) {
      api.output.print('[tmpk] lista pusta');
      return true;
    }
    const newList = state.list.filter((x) => x !== target);
    if (newList.length === state.list.length) {
      api.output.print(`[tmpk] nie znaleziono: ${target}`);
      return true;
    }
    persist(newList);
    api.output.print(`[tmpk] usunieto: ${target}`);
    return true;
  });

  api.aliases.register(/^tmpk--$/, () => {
    persist([]);
    api.output.print('[tmpk] lista wyzerowana');
    return true;
  });
}
