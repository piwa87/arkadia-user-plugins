import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../../lib/registerTextAlias';

export function setupEquipmentAliases(api: PluginApi): void {
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
      '',
      'drugi ',
      'trzeci ',
      'czwarty ',
      'piaty ',
      'szosty ',
      'siodmy ',
      'osmy ',
      'dziewiaty ',
      'dziesiaty ',
      'jedenasty ',
      'dwunasty ',
      'trzynasty ',
      'czternasty ',
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

  // #region sop - place animal on left shoulder
  api.aliases.register(/^sop$/, () => {
    api.command.send('umiesc zwierze na lewym ramieniu');
    return true;
  });

  // #region napw - take a bag, fill it with remains, drop it
  api.aliases.register(/^napw$/, () => {
    api.command.send('wez worek');
    api.command.send('otworz worek');
    api.command.send('napelnij worek');
    api.command.send('odloz worek');
    return true;
  });

  // #region kolczyki+ - put on all earrings and nose piercing
  api.aliases.register(/^kolczyki\+$/, () => {
    api.command.send('koumiesc posrebrzany kulisty kolczyk w nosie');
    api.command.send('koumiesc 1. diamentowy kolczyk w prawym uchu');
    api.command.send('koumiesc 1. diamentowy kolczyk w prawym uchu');
    api.command.send('koumiesc falisty kolczyk z heliodorem w prawym uchu');
    api.command.send('koumiesc 1. diamentowy kolczyk w lewym uchu');
    api.command.send('koumiesc 1. diamentowy kolczyk w lewym uchu');
    api.command.send('koumiesc azurowy kolczyk z blekitna perla w lewym uchu');
    return true;
  });

  // #region kolczyki- - remove all earrings and nose piercing
  api.aliases.register(/^kolczyki-$/, () => {
    api.command.send('kowyjmij posrebrzany kulisty kolczyk z nosa');
    api.command.send('kowyjmij diamentowy kolczyk z prawego ucha');
    api.command.send('kowyjmij diamentowy kolczyk z prawego ucha');
    api.command.send('kowyjmij falisty kolczyk z prawego ucha');
    api.command.send('kowyjmij diamentowy kolczyk z lewego ucha');
    api.command.send('kowyjmij diamentowy kolczyk z lewego ucha');
    api.command.send('kowyjmij azurowy kolczyk z lewego ucha');
    return true;
  });

  // #region r+ - lay out cloak and sit on it to rest
  api.aliases.register(/^r\+$/, () => {
    api.command.send('zdejmij plaszcz');
    api.command.send('rozloz plaszcz');
    api.command.send('usiadz na plaszczu');
    return true;
  });

  // #region r- - stand up, pick up cloak, wear and wrap it
  api.aliases.register(/^r-$/, () => {
    api.command.send('wstan');
    api.command.send('wez plaszcz');
    api.command.send('zpla');
    api.command.send('otu');
    return true;
  });

  // #region ktbuty - take yellow boots from up to 5 bodies
  api.aliases.register(/^ktbuty$/, () => {
    for (let i = 1; i <= 5; i++) {
      api.command.send(`wez zolte buty z ${i}. ciala`);
    }
    return true;
  });

  // #region wple - transfer scraps and stones from bag into backpack
  api.aliases.register(/^wple$/, () => {
    api.command.send('wyj szczatki');
    api.command.send('wyj kamienie');
    api.command.send('wloz szczatki do plecaka');
    api.command.send('wloz kamienie do plecaka');
    api.command.send('zajrzyj do plecaka');
    return true;
  });

  // #region luk - lock the revolving door with signet ring
  api.aliases.register(/^luk$/, () => {
    api.command.send('zamknij drzwi');
    api.command.send('zamknij drzwi kunsztownym sygnetem');
    return true;
  });

  // #region aabn - unlock and open the revolving door
  api.aliases.register(/^aabn$/, () => {
    api.command.send('otworz drzwi kunsztownym sygnetem');
    api.command.send('otworz drzwi');
    return true;
  });

  // #region zwal - refill bag, take out weapons and armor, equip both
  api.aliases.register(/^zwal$/, () => {
    api.command.send('napt');
    api.command.send('wyj bronie');
    api.command.send('wl je');
    api.command.send('napt');
    api.command.send('wyjzb');
    api.command.send('wl je');
    return true;
  });
}
