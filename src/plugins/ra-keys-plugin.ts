import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';

const TAG = 'raKeysPlugin';

interface RaKey {
  id: string;
  name: string;
  description: string;
  domain?: string;
  comment?: string;
  treasury?: null;
}

let _api: PluginApi;
let _aliasId: string | undefined;

export async function init(api: PluginApi): Promise<PluginInfo> {
  _api = api;

  const info: PluginInfo = {
    name: 'RA Keys',
    version: '1.0.0',
    description: 'Koloruje klucze z listy ra:keys w output gry',
    author: 'Piot',
  };

  let raw: string | null;
  try {
    raw = localStorage.getItem('ra:keys');
  } catch {
    return info;
  }
  if (!raw) return info;

  let keys: RaKey[];
  try {
    keys = JSON.parse(raw) as RaKey[];
  } catch {
    api.output.print('[ra_keys] Nie udalo sie sparsowac kluczy z localStorage');
    return info;
  }

  const keyMap = new Map<string, string>();
  for (const entry of keys) {
    // name field format: "item name (annotation)" — annotation may duplicate description
    const m = entry.name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const baseName = (m ? m[1] : entry.name).toLowerCase().trim();
    const desc = entry.description || (m ? m[2] : '');
    if (baseName && desc) {
      keyMap.set(baseName, desc);
    }
  }

  if (keyMap.size === 0) return info;

  const cyanColor = api.colors.fromHex('#00ffff');

  // Sort longest-first so longer patterns shadow any shorter substring they contain
  const sorted = [...keyMap.keys()].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const triggerRegex = new RegExp(`(${escaped.join('|')})`, 'i');
  const globalSource = triggerRegex.source;

  api.triggers.register(
    triggerRegex,
    (line) => {
      const text = line.text;
      const globalRegex = new RegExp(globalSource, 'gi');

      const insertions: Array<{ at: number; label: string }> = [];
      let match: RegExpExecArray | null;
      while ((match = globalRegex.exec(text)) !== null) {
        const desc = keyMap.get(match[0].toLowerCase());
        if (desc) {
          insertions.push({ at: match.index + match[0].length, label: ` (${desc})` });
        }
      }

      // Right-to-left so each insertion doesn't shift the index of the next
      for (let i = insertions.length - 1; i >= 0; i--) {
        line.insert(insertions[i].at, insertions[i].label, cyanColor);
      }

      return line;
    },
    TAG,
  );

  const allNames = [...keyMap.keys()];

  _aliasId = api.aliases.register(/^rakeys!$/i, () => {
    const shuffled = allNames.slice().sort(() => Math.random() - 0.5);
    for (const name of shuffled.slice(0, 4)) {
      api.command.send(`/fake Znalazles ${name} lezacy na ziemi.`, false);
    }
    return true;
  });

  return info;
}

export async function destroy(): Promise<void> {
  _api.triggers.removeByTag(TAG);
  if (_aliasId) _api.aliases.remove(_aliasId);
}
