import type { PluginApi } from '@arkadia/plugin-types';
import { registerDev } from './devAlias';

export function setupMiscAliases(api: PluginApi): void {
  setupHerbAliases(api);
  setupFishingAliases(api);
  setupDepotAliases(api);
  setupContractAliases(api);
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

// ── Fishing ─────────────────────────────────────────────────────────────────

function setupFishingAliases(api: PluginApi): void {
  registerDev(api, /^zarz$/i, 'zarz', 'nabij przynętę i zarzuć wędkę', () => {
    api.command.send('nabij przynete na wedke', false);
    api.command.send('zarzuc wedke', false);
    return true;
  });

  registerDev(api, /^zatn$/i, 'zatn', 'zaciągnij (zatnij) wędkę', () => {
    api.command.send('zacij wedke', false);
    return true;
  });

  registerDev(api, /^wsiec$/i, 'wsiec', 'wyciągnij sieci i zarzuć ponownie', () => {
    api.command.send('wyciagnij sieci', false);
    api.command.send('zarzuc sieci', false);
    return true;
  });

  registerDev(api, /^spryb$/i, 'spryb', 'otwórz popup wędki (/wedka)', () => {
    api.command.send('/wedka');
    return true;
  });
}

// ── Depot ───────────────────────────────────────────────────────────────────

function setupDepotAliases(api: PluginApi): void {
  registerDev(api, /^depo_set$/i, 'depo_set', 'oznacz bieżący pokój jako depozyt (/depozyt_set)', () => {
    api.command.send('/depozyt_set');
    return true;
  });

  registerDev(api, /^depo_show$/i, 'depo_show', 'zawartość depozytu (/depozyt)', () => {
    api.command.send('/depozyt');
    return true;
  });

  registerDev(api, /^dep!$/i, 'dep!', 'lista wszystkich depozytów (/depozyty)', () => {
    api.command.send('/depozyty');
    return true;
  });
}

// ── Contracts / shop orders ──────────────────────────────────────────────────

function setupContractAliases(api: PluginApi): void {
  registerDev(api, /^zl!?$/i, 'zl / zl!', 'zlecenia sklepu (/zlecenia)', () => {
    api.command.send('/zlecenia');
    return true;
  });

  registerDev(api, /^zk!?$/i, 'zk / zk!', 'zlecenia karczmy (/zlecenia)', () => {
    api.command.send('/zlecenia');
    return true;
  });

  registerDev(api, /^ea!$/i, 'ea!', 'pokaż statystyki zarobków z dostaw', () => {
    (api.events as any).emit('showDeliveryStats');
    return true;
  });

  registerDev(api, /^eareset$/i, 'eareset', 'resetuj licznik zarobków', () => {
    (api.events as any).emit('resetDeliveryStats');
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

