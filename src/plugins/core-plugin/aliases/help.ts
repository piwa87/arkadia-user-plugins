import type { PluginApi } from '@arkadia/plugin-types';

type HelpEntry = { section: string } | { cmd: string; desc: string };
const isCmd = (e: HelpEntry): e is { cmd: string; desc: string } => 'cmd' in e;

export function setupHelpAliases(api: PluginApi): void {
  const printHelp = () => {
    const cmdColor = api.colors.fromHex('#7dd3fc');
    const borderColor = api.colors.fromHex('#4b5563');

    const rows: HelpEntry[] = [
      { section: 'HELP' },
      { cmd: '?alias', desc: 'show this help' },

      { section: 'COMBAT' },
      { cmd: 'c', desc: 'attack target 1 (zabij CEL)' },
      { cmd: 'c1 / c2 / c3 / c4', desc: 'attack target 1–4' },
      { cmd: 'z [target/1–4]', desc: 'zabij named target or by slot' },
      { cmd: 'z1 / z2 / z3 / z4', desc: 'attack target by slot' },
      { cmd: 'dp', desc: 'attack all 4 targets in reverse priority' },
      { cmd: 'set <target>', desc: 'set targets 1–4 with ordinal prefixes' },
      { cmd: 'set1–4 <what>', desc: 'set individual target verbatim' },
      { cmd: 'xxx', desc: 'stop fighting' },
      { cmd: 'next!', desc: 'print N E X T visual banner' },

      { section: 'BATTLE PRESETS' },
      { cmd: 'b* presets', desc: 'b_wsiowe bakb bbod bcz bgb bgrz bhas bjas bkis bkur bryb bstr bszcz bu bwy bzbo bzol' },

      { section: 'BIND' },
      { cmd: 'f+ <cmd>', desc: 'set persistent functional bind' },
      { cmd: 'f+! <cmd>', desc: 'set one-shot bind (clears after use)' },
      { cmd: 'f', desc: 'execute functional bind' },
      { cmd: 'f-', desc: 'clear functional bind' },

      { section: 'WEAPONS / SHEATHING' },
      { cmd: 'dob / db', desc: 'draw currently selected weapon' },
      { cmd: 'dob1 / dob2 / dob3', desc: 'select weapon: mace / sword / axe' },
      { cmd: 'dobm', desc: 'draw sword from riveted scabbard' },
      { cmd: 'dobmc', desc: 'draw mace from sling' },
      { cmd: 'dobt', desc: 'draw axe from sling' },
      { cmd: 'dobs', desc: 'draw dagger from ornate scabbard' },
      { cmd: 'opus', desc: 'sheathe dagger into ornate scabbard' },
      { cmd: 'opu', desc: 'sheathe all weapons and sling shield' },
      { cmd: 'skift', desc: 'swap worn shield for one from bag' },
      { cmd: 'skifb1', desc: 'sheathe all, switch to mace, redraw' },
      { cmd: 'dobny', desc: 're-arm after weapon break' },
      { cmd: 'nytarcz', desc: 'replace broken shield' },
      { cmd: 'zb!', desc: 'toggle armor on/off' },
      { cmd: 'macka!', desc: 'evaluate one-handed mace then drop' },
      { cmd: 'miecz!', desc: 'evaluate one-handed sword then drop' },

      { section: 'EQUIPMENT / BAGS' },
      { cmd: 'la+', desc: 'lamp on sequence' },
      { cmd: 'la-', desc: 'lamp off sequence' },
      { cmd: 'napt', desc: 'open worn bag and fill it' },
      { cmd: 'obb', desc: 'look into worn bag' },
      { cmd: 'ot', desc: 'open worn bag' },
      { cmd: 'zt', desc: 'close worn bag' },
      { cmd: 'otu', desc: 'wrap in cloak' },
      { cmd: 'zpla', desc: 'wear cloak and fasten with brooch' },
      { cmd: 'r+ / r-', desc: 'lay out cloak to rest / stand up and re-wear' },
      { cmd: 'sk', desc: 'sprawdz kierunki' },
      { cmd: 'wlz <what>', desc: 'put into worn bag (| for multiple)' },
      { cmd: 'wyj <what>', desc: 'take from worn bag (| for multiple)' },
      { cmd: 'wyjzb', desc: 'take all armor out of bag' },
      { cmd: 'pj <text>', desc: 'przejrzyj <text>' },
      { cmd: 'pr <text>', desc: 'przeczytaj <text>' },
      { cmd: 'wz', desc: 'take armor from body, evaluate, drop' },
      { cmd: 've <item>', desc: 'take item from cart' },
      { cmd: 'vl <item>', desc: 'put item into cart' },
      { cmd: 'wywal <item>', desc: 'take from bag and drop' },
      { cmd: 'ww0', desc: 'strip weapons and armor from 8 bodies' },
      { cmd: 'skk', desc: 'loot chests / coffers / sarcophagi' },
      { cmd: 'wsu <item>', desc: 'try ring on each finger' },
      { cmd: 'okk', desc: 'evaluate stone and put it away' },
      { cmd: 'ciach', desc: 'cut heads off up to 4 bodies' },
      { cmd: 'ciach2', desc: 'draw dagger, cut 4 heads, sheathe' },
      { cmd: 'skiftc', desc: 'move bodies 5–8 to clear space' },
      { cmd: 'rozkok / rozkok2', desc: 'open 5 / 14 cocoons and loot' },
      { cmd: 'wytj', desc: 'take eggs from 4 nests' },
      { cmd: 'sop', desc: 'place animal on left shoulder' },
      { cmd: 'napw', desc: 'fill a bag with remains and drop it' },
      { cmd: 'kolczyki+ / kolczyki-', desc: 'put on / remove all earrings and nose piercing' },
      { cmd: 'ktbuty', desc: 'take yellow boots from up to 5 bodies' },
      { cmd: 'wple', desc: 'move scraps and stones from bag to backpack' },
      { cmd: 'luk', desc: 'lock revolving door with signet ring' },
      { cmd: 'aabn', desc: 'unlock and open revolving door' },
      { cmd: 'zwal', desc: 'refill bag, take out and equip weapons + armor' },

      { section: 'FLASK' },
      { cmd: 'buk', desc: 'drink from flask' },
      { cmd: 'buk+ / buk-', desc: 'attach / detach flask' },
      { cmd: 'buk2', desc: 'quick drink: open bag, take flask, drink, put back' },
      { cmd: 'kub', desc: 'drink from cup' },
      { cmd: 'nap', desc: 'drink water to full' },
      { cmd: 'pbuk <person>', desc: 'detach flask and give to someone' },

      { section: 'COIN' },
      { cmd: 'otm', desc: 'open coin pouch and take coins' },
      { cmd: 'otm1', desc: 'take coins from worn bag' },
      { cmd: 'ztm', desc: 'close coin pouch' },
      { cmd: 'ztm1', desc: 'sort coins in pouch (shake out copper)' },
      { cmd: 'ztm2', desc: 'put copper and silver into worn bag' },
      { cmd: 'zden', desc: 'denominate coins from worn bag' },
      { cmd: 'zden2', desc: 'denominate coins from ornate backpack' },

      { section: 'TRAVEL / ARRIVAL' },
      { cmd: 'ned+', desc: 'arrival trigger → send: ned' },
      { cmd: 'op+', desc: 'arrival trigger → send: op' },
      { cmd: 'op++', desc: 'arrival trigger → send: op + ned' },
      { cmd: 'wned+', desc: 'arrival trigger → send: wned' },
      { cmd: 'wop+', desc: 'arrival trigger → send: wop' },
      { cmd: 'test-arrival', desc: 'simulate ship arrival line' },
      { cmd: 'ned', desc: 'disembark from raft or ship' },
      { cmd: 'op', desc: 'board transport (arm trigger, buy ticket, board)' },
      { cmd: 'opw', desc: 'board carriage / wagon / coach' },
      { cmd: 'wzb', desc: 'jump overboard and check gps' },
      { cmd: 'kigge', desc: 'board ship, loot, disembark' },

      { section: 'TEAM' },
      { cmd: 'ps', desc: 'introduce yourself' },
      { cmd: 'ws', desc: 'support / buff ally' },
      { cmd: 'xx / xxb / xxc', desc: 'stop shielding / blocking / reading' },
      { cmd: 'xp', desc: 'stop current action' },
      { cmd: 'pd', desc: 'leave team' },
      { cmd: 'obd', desc: 'inspect team' },
      { cmd: 'pm / pmd', desc: 'sneak / sneak with team' },

      { section: 'OPTIONS' },
      { cmd: 'opa', desc: 'show panic options' },
      { cmd: 'opa0–7', desc: 'set panic level (0=never … 7=swietna kondycja)' },
      { cmd: 'przyjm+ / przyjm-', desc: 'toggle receiving on/off' },
      { cmd: 'op1–3', desc: 'description level (kazda/druzyna/swoja)' },
      { cmd: 'opi+ / opi-', desc: 'toggle brief mode' },
      { cmd: 'res', desc: 'show resistances' },

      { section: 'HP / KONDYCJE' },
      { cmd: 'k', desc: 'kondycja wszystkich + zmeczenie' },
      { cmd: 'hp+', desc: 'enable full-HP notification' },
      { cmd: 'hp-', desc: 'disable full-HP notification' },
      { cmd: 'kon!', desc: 'test all HP states via /fake' },

      { section: 'MAP' },
      { cmd: '?hl <color> [roomId]', desc: 'highlight room on map' },
      { cmd: '?hl remove [roomId]', desc: 'remove room highlight (restores previous)' },
      { cmd: '?hl clear', desc: 'destroy all highlights' },
      { cmd: 'col1 / col2 / col3', desc: 'highlight current room pink / green / orange' },
      { cmd: 'col0', desc: 'remove current room highlight' },
      { cmd: 'mran', desc: 'move in a random direction from current room' },

      { section: 'LOCATIONS' },
      { cmd: 'pcg', desc: 'pry up the black stone' },
      { cmd: 'pwyj', desc: 'sneak to exit' },
      { cmd: 'szcz / przec', desc: 'squeeze through a crack / generic' },
      { cmd: 'odr', desc: 'try multiple methods to open a door' },
      { cmd: 'radoor <door> <dir>', desc: 'open with signet ring, go through, re-lock' },
      { cmd: 'br', desc: 'knock on gate (zastukaj we wrota)' },
      { cmd: 'br2', desc: 'ring bell / gong / pull cord' },
      { cmd: 'br!', desc: 'preview gate-state labels' },
      { cmd: 'qk', desc: 'lift grate / slab / hatch' },
      { cmd: 'ods!', desc: 'push slab aside' },
      { cmd: 'obsa / osa / zsa', desc: 'examine / open / close sarcophagus' },
      { cmd: 'lyspr / lyspr2', desc: 'light lamp (or candle), sp, extinguish' },
      { cmd: 'pdz / pdk / pdp', desc: 'swim to body / branch / trunk' },
      { cmd: 'pal!', desc: 'try to set a hut on fire' },
      { cmd: 'wod!', desc: 'water area navigation sequence' },
      { cmd: 'xblav', desc: 'Blav puzzle sequence' },
      { cmd: 'xblekitni', desc: 'lever puzzle (Blekitnokrwisci)' },
      { cmd: 'xdru', desc: 'examine stone slabs puzzle' },

      { section: 'MISC' },
      { cmd: 'ze [dir]', desc: 'zerknij (quick look)' },
      { cmd: 'hi', desc: 'hide (schowaj)' },
      { cmd: 'tab', desc: 'read notice board / tablets' },
      { cmd: 'i1–5', desc: 'movement speed (leisurely → fast sprint)' },
      { cmd: 'ooo', desc: 'pull down hood' },
      { cmd: 'pile <target>', desc: 'throw ball at target, auto-retrieve after delay' },
      { cmd: 'wj [target]', desc: 'wskaz (point at)' },
      { cmd: 'brr', desc: 'shake off water (8 times)' },
      { cmd: 'piek!', desc: 'order bread at bakery' },
      { cmd: 'napwsz', desc: 'sharpen all weapons and repair all armor' },
      { cmd: 'sus / sus2', desc: 'disable alarms, extinguish lamp' },
      { cmd: 'ti!', desc: 'stopwatch toggle (start/stop)' },
      { cmd: 'ti!+', desc: 'stopwatch force reset' },
      { cmd: 'zakrec!', desc: 'spin the wheel (random result)' },
      { cmd: 'gale!', desc: 'navigate through galeon with random delays' },
      { cmd: 'hide+ / hide-', desc: 'toggle association listing + signet ring' },
      { cmd: 'rp!', desc: 'reload plugins' },
      { cmd: 'sig <text>', desc: 'print --> <text> to output' },
      { cmd: 'przepasc!', desc: 'loud warning: TAM PRZEPASC!' },
      { cmd: '< <item>', desc: 'sell item (sprzedaj)' },
      { cmd: 'logg', desc: 'mark interesting section in log' },
      { cmd: 'pjpb', desc: 'przejrzyj pobieznie' },
      { cmd: 'kt', desc: 'who is online (kto)' },
      { cmd: 'maketemp <pat> <cmds>', desc: 'arm one-shot trigger for commands' },
      { cmd: 'szuk! <pattern>', desc: 'one-shot search with visual alert' },
      { cmd: 'mgfn <text>', desc: 'megaphone print' },
      { cmd: 'liczpatrol', desc: 'count patrol members' },
      { cmd: '++ / ´´', desc: 'light / extinguish candle' },
      { cmd: 'keys', desc: 'display dungeon key reference list' },

      { section: 'TMPK' },
      { cmd: 'tmpk', desc: 'list highlight mob list' },
      { cmd: 'tmpk+ <name>', desc: 'add mob to highlight list' },
      { cmd: 'tmpk- [name]', desc: 'remove mob from list (or last)' },
      { cmd: 'tmpk--', desc: 'clear entire highlight list' },

      { section: 'DEBUG' },
      { cmd: '?map [id]', desc: 'print current or specific room JSON' },
      { cmd: '?gmcp [path]', desc: 'print GMCP state (or sub-path)' },

      { section: 'EMOTES' },
      { cmd: 'emotes', desc: 'ce, cmo, haha, hm?, kiw, krz1, krz2, kurw, ma, mach, obr, par, pod, pok, pokr, roll, roz, semig, superwejscie, usr1–3, uwa, wypat, wyb, wytr, wys1–2, zag, zagw, zam, zar, zat, zd' },
    ];

    const cmdEntries = rows.filter(isCmd);
    const cmdW = Math.max(...cmdEntries.map((e) => e.cmd.length));
    const descW = Math.max(...cmdEntries.map((e) => e.desc.length));
    const inner = 1 + cmdW + 2 + descW + 1;
    const hr = '─'.repeat(inner);
    const title = ' My Aliases';

    const printBorder = (text: string) => {
      const buf = new api.AnsiAwareBuffer(text);
      buf.color([0, text.length], borderColor);
      api.output.print(buf);
    };

    printBorder(`┌${hr}┐`);
    printBorder(`│${title.padEnd(inner)}│`);

    for (const row of rows) {
      if (!isCmd(row)) {
        const label = ` ${row.section} `;
        const total = inner - label.length;
        const left = Math.floor(total / 2);
        const right = total - left;
        printBorder(`├${'─'.repeat(left)}${label}${'─'.repeat(right)}┤`);
      } else {
        const line = `│ ${row.cmd.padEnd(cmdW)}  ${row.desc.padEnd(descW)} │`;
        const buf = new api.AnsiAwareBuffer(line);
        buf.color([2, 2 + row.cmd.length], cmdColor);
        api.output.print(buf);
      }
    }

    printBorder(`└${hr}┘`);
  };

  api.aliases.register(/^\?alias$/, () => {
    printHelp();
    return true;
  });
}
