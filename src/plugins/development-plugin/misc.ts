import type { PluginApi } from '@arkadia/plugin-types';
import { registerDev } from './devAlias';

export function setupMiscAliases(api: PluginApi): void {
  setupHerbAliases(api);
  setupKnowledgeAliases(api);
}

// ── Herbs ───────────────────────────────────────────────────────────────────

function setupHerbAliases(api: PluginApi): void {
  registerDev(api, /^obz$/i, 'obz', 'zlicz zioła we wszystkich sakwach (/ziola_buduj)', () => {
    api.command.send('/ziola_buduj');
    return true;
  });

  registerDev(api, /^obzap$/i, 'obzap', 'pokaż stan rezerwy ziół (/ziola_pokaz)', () => {
    api.command.send('/ziola_pokaz');
    return true;
  });

  registerDev(
    api,
    /^lec([1-3])$/i,
    'lec1 / lec2 / lec3',
    (m) => `weź zioło kat. ${m?.[1] ?? '?'} ze skrytki (/wezz)`,
    (matches) => {
      const n = matches?.[1] ?? '1';
      api.command.send(`/wezz lec${n}`);
      return true;
    },
  );

  registerDev(api, /^lec9$/i, 'lec9', 'użyj wszystkich Lec1 hurtowo (/zi uzyj lec1 99)', () => {
    api.command.send('/zi uzyj lec1 99');
    return true;
  });

  registerDev(api, /^zisort$/i, 'zisort', 'otwórz UI sortowania ziół (/ziola)', () => {
    api.command.send('/ziola');
    return true;
  });

  registerDev(api, /^zx$/i, 'zx', 'przelicz zioła w sakwach (/ziola_buduj)', () => {
    api.command.send('/ziola_buduj');
    return true;
  });
}

// ── Knowledge ───────────────────────────────────────────────────────────────

function setupKnowledgeAliases(api: PluginApi): void {
  registerDev(api, /^zg$/i, 'zg', 'zglebiaj wiedze (bez kategorii)', () => {
    api.command.send('zglebiaj wiedze', false);
    return true;
  });

  registerDev(
    api,
    /^zgk\s+(\S+)\s+(.+)$/i,
    'zgk <kat> <ks.>',
    (m) => `zglebiaj wiedze o ${m?.[1] ?? '?'} z ${m?.[2]?.trim() ?? '?'}`,
    (matches) => {
      const category = matches?.[1]?.trim();
      const book = matches?.[2]?.trim();
      if (category && book) api.command.send(`zglebiaj wiedze o ${category} z ${book}`, false);
      return true;
    },
  );

  registerDev(api, /^wd$/i, 'wd', 'lista wiedzy postaci (/wiedza)', () => {
    api.command.send('/wiedza');
    return true;
  });
}

