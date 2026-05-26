import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../../lib/registerTextAlias';

export function setupEquipmentAliases(api: PluginApi): void {
  // #region la+
  api.aliases.register(/^la\+$/, () => {
    api.command.send('wyj lampe|olej');
    api.command.send('przytrocz lampe');
    api.command.send('naplam');
    api.command.send('/zap');
    return true;
  });

  // #region la-
  api.aliases.register(/^la-$/, () => {
    api.command.send('/zg');
    api.command.send('odtrocz lampe');
    api.command.send('wlz lampe|oleje');
    return true;
  });

  // #region napt
  api.aliases.register(/^napt$/, () => {
    api.command.send('otworz zalozona torbe');
    api.command.send('napelnij zalozona torbe');
    return true;
  });

  // #region obb
  api.aliases.register(/^obb$/, () => {
    api.command.send('zajrzyj do zalozonej torby');
    return true;
  });

  // #region ot
  api.aliases.register(/^ot$/, () => {
    api.command.send('otworz zalozona torbe');
    return true;
  });

  // #region pj [text]
  registerTextAlias(api, /^pj(?:\s+(.+))?$/, 'przejrzyj');

  // #region pr [text]
  registerTextAlias(api, /^pr(?:\s+(.+))?$/, 'przeczytaj');

  // #region wlz [what]
  api.aliases.register(/^wlz(?:\s+(.+))?$/, (matches) => {
    const text = matches?.[1]?.trim();
    if (!text) return true;
    for (const item of text
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)) {
      api.command.send(`wloz ${item} do zalozonej torby`);
    }
    return true;
  });

  // #region wyj [what]
  api.aliases.register(/^wyj(?:\s+(.+))?$/, (matches) => {
    const text = matches?.[1]?.trim();
    if (!text) return true;
    for (const item of text
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)) {
      api.command.send(`wez ${item} z zalozonej torby`);
    }
    return true;
  });

  // #region zt
  api.aliases.register(/^zt$/, () => {
    api.command.send('zamknij zalozona torbe');
    api.command.send('la+');
    return true;
  });

  // #region otu
  api.aliases.register(/^otu$/, () => {
    api.command.send('otul sie plaszczem');
    return true;
  });

  // #region sk
  api.aliases.register(/^sk$/, () => {
    api.command.send('sprawdz kierunki');
    return true;
  });

  // #region wz - take armor from body, evaluate, drop
  api.aliases.register(/^wz$/, () => {
    api.command.send('wez zbroje z ciala');
    api.command.send('ocen ja');
    api.command.send('odloz ja');
    return true;
  });

  // #region ve [item] - take item from cart
  api.aliases.register(/^ve(?:\s+(.+))?$/, (matches) => {
    const item = matches?.[1]?.trim();
    if (!item) return true;
    api.command.send(`wez ${item} z wozu`);
    return true;
  });

  // #region vl [item] - put item into cart
  api.aliases.register(/^vl(?:\s+(.+))?$/, (matches) => {
    const item = matches?.[1]?.trim();
    if (!item) return true;
    api.command.send(`wloz ${item} do wozu`);
    return true;
  });

  // #region wywal [item] - take item from bag and drop it
  api.aliases.register(/^wywal(?:\s+(.+))?$/, (matches) => {
    const item = matches?.[1]?.trim();
    if (!item) return true;
    api.command.send(`wyj ${item}`);
    api.command.send(`odloz ${item}`);
    return true;
  });

  // #region wyjzb - take all armor (from worn)
  api.aliases.register(/^wyjzb$/, () => {
    api.command.send('wyj wszystkie zbroje');
    return true;
  });

  // #region ww0 - strip weapons and armor from 8 bodies
  api.aliases.register(/^ww0$/, () => {
    for (let i = 1; i <= 8; i++) {
      api.command.send(`wez wszystkie bronie z ${i}. ciala`);
      api.command.send('odloz je');
      api.command.send(`wez wszystkie zbroje z ${i}. ciala`);
      api.command.send('odloz je');
    }
    return true;
  });

  // #region skk - open and loot chests/coffers/sarcophagi
  api.aliases.register(/^skk$/, () => {
    api.command.send('otworz skrzynie');
    api.command.send('wez wszystko ze skrzyni');
    api.command.send('otworz druga skrzynie');
    api.command.send('wez wszystko z drugiej skrzyni');
    api.command.send('otworz kufer');
    api.command.send('wez wszystko z kufra');
    api.command.send('otworz sarkofag');
    api.command.send('wez wszystko z sarkofagu');
    api.command.send('otworz trumne');
    api.command.send('wez wszystko z trumny');
    return true;
  });

  // #region wsu [item] - try to put ring on each finger
  api.aliases.register(/^wsu(?:\s+(.+))?$/, (matches) => {
    const item = matches?.[1]?.trim();
    if (!item) return true;
    api.command.send(`wsun ${item} na maly palec`);
    api.command.send(`wsun ${item} na palec wskazujacy`);
    api.command.send(`wsun ${item} na palec srodkowy`);
    api.command.send(`wsun ${item} na srodkowy palec`);
    api.command.send(`wsun ${item} na palec serdeczny`);
    return true;
  });

  // #region okk - evaluate a stone and put it away
  api.aliases.register(/^okk$/, () => {
    api.command.send('ocen kamien');
    api.command.send('wlz kamien');
    return true;
  });

  // #region ciach - cut heads off up to 4 bodies and drop
  api.aliases.register(/^ciach$/, () => {
    api.command.send('odrab glowe od ciala');
    api.command.send('odrab glowe od drugiego ciala');
    api.command.send('odrab glowe od trzeciego ciala');
    api.command.send('odrab glowe od czwartego ciala');
    api.command.send('odloz glowy');
    return true;
  });

  // #region ciach2 - draw knife, cut heads, sheathe
  api.aliases.register(/^ciach2$/, () => {
    api.command.send('opusc bron');
    api.command.send('dobs');
    const ordinals = ['', 'drugiego ', 'trzeciego ', 'czwartego '];
    for (const ord of ordinals) {
      api.command.send(`odetnij glowe od ${ord}ciala`);
    }
    api.command.send('odloz glowy');
    api.command.send('opus');
    api.command.send('dob');
    return true;
  });

  // #region skiftc - move bodies 5-8 to clear space
  api.aliases.register(/^skiftc$/, () => {
    const ordinals = ['piate', 'szoste', 'siodme', 'osme'];
    for (const ord of ordinals) {
      api.command.send(`wez ${ord} cialo`);
      api.command.send('odloz je');
    }
    return true;
  });

  // #region rozkok - open 5 cocoons and take contents
  api.aliases.register(/^rozkok$/, () => {
    const ordinals = ['', 'drugi ', 'trzeci ', 'czwarty ', 'piaty '];
    for (const ord of ordinals) {
      api.command.send(`rozerwij ${ord}kokon`);
      api.command.send('wez wszystko z niego');
    }
    return true;
  });

  // #region rozkok2 - open 14 cocoons and take contents
  api.aliases.register(/^rozkok2$/, () => {
    const ordinals = [
      '', 'drugi ', 'trzeci ', 'czwarty ', 'piaty ', 'szosty ', 'siodmy ',
      'osmy ', 'dziewiaty ', 'dziesiaty ', 'jedenasty ', 'dwunasty ',
      'trzynasty ', 'czternasty ',
    ];
    for (const ord of ordinals) {
      api.command.send(`rozerwij ${ord}kokon`);
      api.command.send('wez wszystko z niego');
    }
    return true;
  });

  // #region wytj - take eggs from 4 nests
  api.aliases.register(/^wytj$/, () => {
    for (let i = 1; i <= 4; i++) {
      api.command.send(`wez jaja z ${i}. gniazda`);
    }
    return true;
  });
}
