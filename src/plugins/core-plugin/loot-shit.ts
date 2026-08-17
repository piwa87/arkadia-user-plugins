import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';

/**
 * Port of the CMUD "Shit" class — loot management for different mob types.
 *
 * Each group defines item lists dropped by a specific mob type, with take/sell/store
 * aliases that expand to game commands. No triggers needed — pure aliases, auto-cleaned
 * on unload.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

interface LootGroup {
  key: string;
  label: string;
  items: string[];
  /** Aliases that trigger the take sequence. */
  takeAliases: string[];
  /** Aliases that trigger the sell sequence (optional — some groups only store). */
  sellAliases?: string[];
  /** Aliases that trigger the store sequence (optional). */
  storeAliases?: string[];
}

// ── Item lists ─────────────────────────────────────────────────────────────────

const ORK_SHIT = [
  'wytarte skorzane kurtki',
  'drewniane okute tarcze',
  'czarne zakrzywione szable',
  'stalowe ciezkie napiersniki',
  'ciemne matowe szable',
  'dlugie mysliwskie noze',
  'lekkie poreczne noze',
  'zelazne naramienniki',
  'zelazne napiersniki',
  'skorzane ocieplane kaftany',
  'ciezkie obreczowe helmy',
  'okragle drewniane tarcze',
  'polatane stalowe kolczugi',
  'ciezkie szerokie szable',
  'zakrzywione goblinskie szable',
  'lekkie polkoliste topory',
  'krotkie czarne wlocznie',
  'stalowe otwarte helmy',
];

const GOB_SHIT = [
  'mysliwskie skorzane kaftany',
  'krzywe lekkie tarcze',
  'krzywe krotkie noze',
  'okragle drewniane tarcze',
  'przetarte lekkie kolczugi',
  'goblinskie kamienne wlocznie',
];

const STR_SHIT = [
  'zwykle stalowe miecze',
  'ciezkie stalowe kirysy',
  'lsniace stalowe helmy',
  'ciezkie stalowe paweze',
  'lekkie poszczerbione miecze',
  'lekkie stalowe zbroje',
  'lekkie zwykle topory',
  'stalowe lsniace kirysy',
  'czarne dlugie piki',
  'pikowane cieple kaftany',
  'wielkie ciezkie tarcze',
  'zwykle proste miecze',
  'ciezkie oficerskie buzdygany',
];

const CAMPO_SHIT = [
  'kruczoczarne dlugie kolczugi',
  'dwureczne czarne mloty',
  'matowe nareczaki',
  'matowe smolistoczarne napiersniki',
  'faliste flambergi',
  'czarne luskowe helmy',
  'stare rzezbione wlocznie',
  'srebrzyste jednoreczne topory',
  'polyskliwe czarne helmy',
  'polyskliwe czarne diademy',
  'niewielkie zdobione korony',
];

// ── Groups ──────────────────────────────────────────────────────────────────────

const GROUPS: LootGroup[] = [
  {
    key: 'ork',
    label: 'ork',
    items: ORK_SHIT,
    takeAliases: ['work'],
    sellAliases: ['sork', 'sporkshit'],
  },
  {
    key: 'gob',
    label: 'goblin',
    items: GOB_SHIT,
    takeAliases: ['wgob'],
    sellAliases: ['sgob', 'spox'],
  },
  {
    key: 'str',
    label: 'strzyga',
    items: STR_SHIT,
    takeAliases: ['wstr'],
    storeAliases: ['strned'],
  },
  {
    key: 'campo',
    label: 'campo',
    items: CAMPO_SHIT,
    takeAliases: ['wcampo'],
    sellAliases: ['scampo', 'spcampo'],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────────

function wezWszystkie(api: PluginApi, items: string[]): void {
  for (const item of items) {
    api.command.send(`wez ${item}`, false);
  }
}

function wyjWszystkie(api: PluginApi, items: string[]): void {
  for (const item of items) {
    api.command.send(`wyj ${item}`, false);
  }
}

function sprzedajWszystkie(api: PluginApi, items: string[]): void {
  for (const item of items) {
    api.command.send(`sprzedaj ${item}`, false);
  }
}

// (findGroupByAlias omitted — groups are resolved directly in the parameterized aliases)

// ── Alias callbacks ─────────────────────────────────────────────────────────────

// Take sequences //

function takeOrk(api: PluginApi): void {
  api.command.send('ot', false);
  wezWszystkie(api, ORK_SHIT);
  api.command.send('napelnij torbe', false);
  api.command.send('napelnij plecak', false);
  api.command.send('napelnij worek');
}

function takeGob(api: PluginApi): void {
  api.command.send('ot', false);
  api.command.send('otworz worek', false);
  api.command.send('w1', false);
  api.command.send('w2', false);
  api.command.send('w3', false);
  api.command.send('w4', false);
  wezWszystkie(api, GOB_SHIT);
  api.command.send('napelnij worek', false);
  api.command.send('napp');
}

function takeCampo(api: PluginApi): void {
  api.command.send('ot', false);
  wezWszystkie(api, CAMPO_SHIT);
  api.command.send('napt');
}

// Sell sequences //

function sellOrk(api: PluginApi): void {
  api.command.send('ot', false);
  wyjWszystkie(api, ORK_SHIT);
  api.command.send('oproznij worek', false);
  sprzedajWszystkie(api, ORK_SHIT);
}

function sellGob(api: PluginApi): void {
  api.command.send('ot', false);
  wyjWszystkie(api, GOB_SHIT);
  api.command.send('oproznij worek', false);
  sprzedajWszystkie(api, GOB_SHIT);
}

function sellCampo(api: PluginApi): void {
  wyjWszystkie(api, CAMPO_SHIT);
  sprzedajWszystkie(api, CAMPO_SHIT);
}

// Store sequences //

function storeStr(api: PluginApi): void {
  const backpacks = [
    'ciemnozielonego plecaka',
    'drugiego ciemnozielonego plecaka',
    'trzeciego ciemnozielonego plecaka',
    'czwartego ciemnozielonego plecaka',
  ];
  for (const item of STR_SHIT) {
    api.command.send(`wyj ${item}`, false);
    for (const bp of backpacks) {
      api.command.send(`wloz ${item} do ${bp}`, false);
    }
  }
}

// ── Registration ────────────────────────────────────────────────────────────────

export function setupLootShitAliases(api: PluginApi): void {
  // ── Specific aliases (original names) ────────────────────────────────────

  api.aliases.register(/^work$/i, () => {
    takeOrk(api);
    return true;
  });
  api.aliases.register(/^sporkshit$/i, () => {
    sellOrk(api);
    return true;
  });

  api.aliases.register(/^wgob$/i, () => {
    takeGob(api);
    return true;
  });
  api.aliases.register(/^spox$/i, () => {
    sellGob(api);
    return true;
  });

  api.aliases.register(/^wcampo$/i, () => {
    takeCampo(api);
    return true;
  });
  api.aliases.register(/^spcampo$/i, () => {
    sellCampo(api);
    return true;
  });

  api.aliases.register(/^strned$/i, () => {
    storeStr(api);
    return true;
  });

  // ── Parameterized aliases: w <group> / s <group> ─────────────────────────

  api.aliases.register(/^w\s+(ork|gob|str|campo)$/i, (matches) => {
    const key = matches![1].toLowerCase();
    const group = GROUPS.find((g) => g.key === key);
    if (!group) return true;
    switch (key) {
      case 'ork':
        takeOrk(api);
        break;
      case 'gob':
        takeGob(api);
        break;
      case 'campo':
        takeCampo(api);
        break;
      // str has no take sequence — only store
    }
    return true;
  });

  api.aliases.register(/^s\s+(ork|gob|campo)$/i, (matches) => {
    const key = matches![1].toLowerCase();
    switch (key) {
      case 'ork':
        sellOrk(api);
        break;
      case 'gob':
        sellGob(api);
        break;
      case 'campo':
        sellCampo(api);
        break;
    }
    return true;
  });

  // ── sall — sell all groups ────────────────────────────────────────────────

  api.aliases.register(/^sall$/i, () => {
    api.command.send('ot', false);
    wyjWszystkie(api, ORK_SHIT);
    wyjWszystkie(api, GOB_SHIT);
    wyjWszystkie(api, CAMPO_SHIT);
    api.command.send('oproznij worek', false);
    sprzedajWszystkie(api, ORK_SHIT);
    sprzedajWszystkie(api, GOB_SHIT);
    sprzedajWszystkie(api, CAMPO_SHIT);
    return true;
  });

  // ── groups — list configured groups with item counts ─────────────────────

  api.aliases.register(/^groups$/i, () => {
    const header = getAnsiFormatState(6, api); // dark yellow
    const accent = getAnsiFormatState(13, api); // bright magenta
    const dim = getAnsiFormatState(8, api); // dark gray

    const print = (text: string, color: typeof header) => {
      const buf = new api.AnsiAwareBuffer(text);
      buf.color([0, text.length], color);
      api.output.print(buf);
    };

    const line = (parts: { text: string; color: typeof header }[]) => {
      const buf = new api.AnsiAwareBuffer();
      for (const p of parts) {
        const start = buf.text.length;
        buf.append(p.text);
        buf.color([start, buf.text.length], p.color);
      }
      api.output.print(buf);
    };

    print('=== Loot Groups ===', header);
    for (const g of GROUPS) {
      const tags: string[] = [];
      tags.push(`take: ${g.takeAliases.join(', ')}`);
      if (g.sellAliases?.length) tags.push(`sell: ${g.sellAliases.join(', ')}`);
      if (g.storeAliases?.length) tags.push(`store: ${g.storeAliases.join(', ')}`);
      line([
        { text: `  ${g.key}`, color: accent },
        { text: ` (${g.items.length} items)`, color: dim },
        { text: ` — ${tags.join(' | ')}`, color: dim },
      ]);
    }
    return true;
  });
}
