import type { PluginApi } from '@arkadia/plugin-types';

const TAG = 'raKeysColoring';

interface RaKey {
  id: string;
  name: string;
  description: string;
  domain?: string;
  comment?: string;
  treasury?: null;
}

export function setupRaKeysColoring(api: PluginApi): void {
  const cyanColor = api.colors.fromHex('#00ffff');

  let raw: string | null;
  try {
    raw = localStorage.getItem('ra:keys');
  } catch {
    return;
  }
  if (!raw) return;

  let keys: RaKey[];
  try {
    keys = JSON.parse(raw) as RaKey[];
  } catch {
    api.output.print('[ra_keys] Nie udalo sie sparsowac kluczy z localStorage');
    return;
  }

  const keyMap = new Map<string, string>();
  for (const entry of keys) {
    // name format: "item name (annotation)" — strip the trailing (annotation)
    const m = entry.name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const baseName = (m ? m[1] : entry.name).toLowerCase().trim();
    const desc = entry.description || (m ? m[2] : '');
    if (baseName && desc) {
      keyMap.set(baseName, desc);
    }
  }

  if (keyMap.size === 0) return;

  // Longest patterns first to avoid partial shadowing
  const sorted = [...keyMap.keys()].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const triggerRegex = new RegExp(`(${escaped.join('|')})`, 'i');
  const globalSource = triggerRegex.source;

  api.triggers.register(triggerRegex, (line) => {
    const text = line.text;
    const globalRegex = new RegExp(globalSource, 'gi');

    const insertions: Array<{ at: number; label: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = globalRegex.exec(text)) !== null) {
      const desc = keyMap.get(m[0].toLowerCase());
      if (desc) {
        insertions.push({ at: m.index + m[0].length, label: ` (${desc})` });
      }
    }

    for (let i = insertions.length - 1; i >= 0; i--) {
      line.insert(insertions[i].at, insertions[i].label, cyanColor);
    }

    return line;
  }, TAG);

  const allNames = [...keyMap.keys()];

  api.aliases.register(/^rakeys!$/i, () => {
    const shuffled = allNames.slice().sort(() => Math.random() - 0.5);
    for (const name of shuffled.slice(0, 4)) {
      api.command.send(`/fake Znalazles ${name} lezacy na ziemi.`, false);
    }
    return true;
  });
}
