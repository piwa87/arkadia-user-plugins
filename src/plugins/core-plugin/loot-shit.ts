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
 *   Take: wez <item> × N → napt
 *   Sell: 4 cycles of napt → wyj (bronie|zb) → sprzedaj je, 1s cooldown between
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
    takeAliases: ['wezork'],
    sellAliases: ['spork'],
  },
  {
    key: 'gob',
    label: 'goblin',
    items: GOB_SHIT,
    takeAliases: ['wezgob'],
    sellAliases: ['spgob'],
  },
  {
    key: 'cam',
    label: 'campo',
    items: CAMPO_SHIT,
    takeAliases: ['wezcam'],
    sellAliases: ['spcam'],
  },
  {
    key: 'has',
    label: 'has',
    items: HAS_SHIT,
    takeAliases: ['wezhas'],
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
  ['wyj bronie', 'sprzedaj je'],
  ['wyjzb', 'sprzedaj je'],
  ['wyj bronie', 'sprzedaj je'],
  ['wyjzb', 'sprzedaj je'],
];

/**
 * Standard sell: 4 cycles alternating bronie/wyjzb, 1s cooldown between.
 * Uses async/await via promise delay so commands don't pile up too fast.
 */
async function sellSequence(api: PluginApi): Promise<void> {
  for (let i = 0; i < SELL_CYCLES.length; i++) {
    api.command.send('napt', false);
    for (const cmd of SELL_CYCLES[i]) {
      api.command.send(cmd, false);
    }
    if (i < SELL_CYCLES.length - 1) {
      await delay(1000);
    }
  }
}

// ── Take callbacks ──────────────────────────────────────────────────────────────

function takeOrk(api: PluginApi): void {
  takeSequence(api, ORK_SHIT);
}

function takeGob(api: PluginApi): void {
  takeSequence(api, GOB_SHIT);
}

function takeCam(api: PluginApi): void {
  takeSequence(api, CAMPO_SHIT);
}

function takeHas(api: PluginApi): void {
  takeSequence(api, HAS_SHIT);
}

// ── Registration ────────────────────────────────────────────────────────────────

export function setupLootShitAliases(api: PluginApi): void {
  // ── Specific aliases: wez<group> / sp<group> ─────────────────────────────

  api.aliases.register(/^wezork$/i, () => {
    takeOrk(api);
    return true;
  });
  api.aliases.register(/^spork$/i, () => {
    sellSequence(api);
    return true;
  });

  api.aliases.register(/^wezgob$/i, () => {
    takeGob(api);
    return true;
  });
  api.aliases.register(/^spgob$/i, () => {
    sellSequence(api);
    return true;
  });

  api.aliases.register(/^wezcam$/i, () => {
    takeCam(api);
    return true;
  });
  api.aliases.register(/^spcam$/i, () => {
    sellSequence(api);
    return true;
  });

  api.aliases.register(/^wezhas$/i, () => {
    takeHas(api);
    return true;
  });
  api.aliases.register(/^sphas$/i, () => {
    sellSequence(api);
    return true;
  });

  // ── Parameterized aliases: wez <group> / sp <group> ──────────────────────

  api.aliases.register(/^wez\s+(ork|gob|cam|has)$/i, (matches) => {
    const key = matches![1].toLowerCase();
    const group = GROUPS.find((g) => g.key === key);
    if (!group) return true;
    takeSequence(api, group.items);
    return true;
  });

  api.aliases.register(/^sp\s+(ork|gob|cam|has)$/i, (matches) => {
    const key = matches![1].toLowerCase();
    const group = GROUPS.find((g) => g.key === key);
    if (!group) return true;
    sellSequence(api);
    return true;
  });

  // ── sall — sell all groups ────────────────────────────────────────────────

  api.aliases.register(/^sall$/i, () => {
    sellSequence(api);
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
