import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';

/**
 * Port of the CMUD "Shit" class — loot management for different mob types.
 *
 * Each group defines item lists dropped by a specific mob type, with aliases
 * that expand to game commands. No triggers needed — pure aliases, auto-cleaned
 * on unload.
 *
 * Standard sequences:
 *   Take: w<group> → wez <item> × N → napt
 *   Sell: sprzedaj wszystkie tarcze → sprzedaj kolczugi → 4 sell cycles
 */

// ── Types ──────────────────────────────────────────────────────────────────────

interface LootGroup {
  key: string;
  label: string;
  items: string[];
  /** Aliases that trigger the take sequence. */
  takeAliases: string[];
  /** Aliases that trigger the sell sequence. */
  sellAliases?: string[];
}

// ── Item lists ─────────────────────────────────────────────────────────────────

const ORK_SHIT = [
  'ciemne matowe szable',
  'ciezkie obreczowe helmy',
  'ciezkie szerokie szable',
  'czarne zakrzywione szable',
  'dlugie mysliwskie noze',
  'drewniane okute tarcze',
  'krotkie czarne wlocznie',
  'lekkie polkoliste topory',
  'lekkie poreczne noze',
  'okragle drewniane tarcze',
  'polatane stalowe kolczugi',
  'skorzane ocieplane kaftany',
  'stalowe ciezkie napiersniki',
  'stalowe otwarte helmy',
  'wytarte skorzane kurtki',
  'zakrzywione goblinskie szable',
  'zelazne naramienniki',
  'zelazne napiersniki',
];

const GOB_SHIT = [
  'goblinskie kamienne wlocznie',
  'krzywe krotkie noze',
  'krzywe lekkie tarcze',
  'mysliwskie skorzane kaftany',
  'okragle drewniane tarcze',
  'przetarte lekkie kolczugi',
];

const CAMPO_SHIT = [
  'czarne luskowe helmy',
  'dwureczne czarne mloty',
  'faliste flambergi',
  'kruczoczarne dlugie kolczugi',
  'matowe nareczaki',
  'matowe smolistoczarne napiersniki',
  'niewielkie zdobione korony',
  'polyskliwe czarne diademy',
  'polyskliwe czarne helmy',
  'srebrzyste jednoreczne topory',
  'stare rzezbione wlocznie',
];

const HAS_SHIT = [
  'ciemne plytkowe lewe naramienniki',
  'ciemne plytkowe prawe naramienniki',
  'ciezkie lancuchowe korbacze',
  'ciezkie poszczerbione szable',
  'folgowe ciemne lewe naramienniki',
  'folgowe ciemne prawe naramienniki',
  'folgowe stalowe napiersniki',
  'jednoreczne krasnoludzkie mloty',
  'jednoreczne krasnoludzkie topory',
  'krasnoludzkie pierscieniowe kolczugi',
  'obreczowe wzmacniane helmy z rogami',
  'okute krasnoludzkie buty',
  'otwarte hobgoblinskie helmy z rogami',
  'pancerne stalowe lewe rekawice',
  'pancerne stalowe prawe rekawice',
  'przyciemniane plytkowe kirysy',
  'trojkatne wzmacniane tarcze',
];

// ── Groups ──────────────────────────────────────────────────────────────────────

const GROUPS: LootGroup[] = [
  {
    key: 'ork',
    label: 'ork',
    items: ORK_SHIT,
    takeAliases: ['work'],
    sellAliases: ['spork'],
  },
  {
    key: 'gob',
    label: 'goblin',
    items: GOB_SHIT,
    takeAliases: ['wgob'],
    sellAliases: ['spgob'],
  },
  {
    key: 'cam',
    label: 'campo',
    items: CAMPO_SHIT,
    takeAliases: ['wcam'],
    sellAliases: ['spcam'],
  },
  {
    key: 'has',
    label: 'has',
    items: HAS_SHIT,
    takeAliases: ['whas'],
    sellAliases: ['sphas'],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────────

function wezWszystkie(api: PluginApi, items: string[]): void {
  for (const item of items) {
    api.command.send(`wez ${item}`, false);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Standard sequences ─────────────────────────────────────────────────────────

/** Standard take: wez group items → napt. */
function takeSequence(api: PluginApi, items: string[]): void {
  wezWszystkie(api, items);
  api.command.send('napt', false);
}

const SELL_CYCLES: string[][] = [
  ['napt', 'wyj bronie', 'sprzedaj je'],
  ['napt', 'wyjzb', 'sprzedaj je'],
  ['napt', 'wyj bronie', 'sprzedaj je'],
  ['napt', 'wyjzb', 'sprzedaj je'],
];

/** Standard sell: sell shields and chainmail, then run the four sell cycles. */
async function sellSequence(api: PluginApi): Promise<void> {
  await api.command.send('sprzedaj wszystkie tarcze', false);
  await delay(1000);
  await api.command.send('sprzedaj kolczugi', false);

  for (let index = 0; index < SELL_CYCLES.length; index++) {
    await delay(1000);
    for (const command of SELL_CYCLES[index]) {
      await api.command.send(command, false);
    }
  }
}

function sellGroup(api: PluginApi): void {
  void sellSequence(api);
}

function getGroup(key: string): LootGroup | undefined {
  return GROUPS.find((group) => group.key === key);
}

function registerTakeAlias(api: PluginApi, group: LootGroup): void {
  api.aliases.register(new RegExp(`^${group.takeAliases[0]}$`, 'i'), () => {
    takeSequence(api, group.items);
    return true;
  });
}

function registerSellAlias(api: PluginApi, group: LootGroup): void {
  for (const alias of group.sellAliases ?? []) {
    api.aliases.register(new RegExp(`^${alias}$`, 'i'), () => {
      sellGroup(api);
      return true;
    });
  }
}

// ── Registration ────────────────────────────────────────────────────────────────

export function setupLootShitAliases(api: PluginApi): void {
  // ── Specific aliases: w<group> / sp<group> ────────────────────────────────

  for (const group of GROUPS) {
    registerTakeAlias(api, group);
    registerSellAlias(api, group);
  }

  // ── Parameterized aliases: w <group> / sp <group> ────────────────────────

  api.aliases.register(/^w\s+(ork|gob|cam|has)$/i, (matches) => {
    const key = matches![1].toLowerCase();
    const group = getGroup(key);
    if (!group) return true;
    takeSequence(api, group.items);
    return true;
  });

  api.aliases.register(/^sp\s+(ork|gob|cam|has)$/i, (matches) => {
    const key = matches![1].toLowerCase();
    const group = getGroup(key);
    if (!group) return true;
    sellGroup(api);
    return true;
  });

  // ── sall — sell all groups ────────────────────────────────────────────────

  api.aliases.register(/^sall$/i, () => {
    void sellSequence(api);
    return true;
  });

  // ── zlomuj — gather and store scrap ──────────────────────────────────────

  api.aliases.register(/^zlomuj$/i, () => {
    api.command.send('wez wszystko', false);
    api.command.send('odloz szczatki', false);
    api.command.send('napt', false);
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
      line([
        { text: `  ${g.key}`, color: accent },
        { text: ` (${g.items.length} items)`, color: dim },
        { text: ` — ${tags.join(' | ')}`, color: dim },
      ]);
    }
    return true;
  });
}
