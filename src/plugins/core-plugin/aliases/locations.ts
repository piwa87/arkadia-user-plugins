import type { PluginApi } from '@arkadia/plugin-types';

export function setupLocationsAliases(api: PluginApi): void {
  // pcg - pry up the black stone
  api.aliases.register(/^pcg$/, () => {
    api.command.send('podwaz czarny glaz');
    return true;
  });

  // pwyj - sneak to exit
  api.aliases.register(/^pwyj$/, () => {
    api.command.send('przemknij sie do wyjscia');
    return true;
  });

  // wod! - water area navigation sequence
  api.aliases.register(/^wod!$/, () => {
    api.command.send('skocz do stawu');
    api.command.send('przejdz za wodospad');
    api.command.send('n');
    api.command.send('pchnij sciane');
    return true;
  });

  // odr - try multiple methods to open a door
  api.aliases.register(/^odr$/, () => {
    api.command.send('otworz drzwi kluczykiem');
    api.command.send('otworz drzwi kluczem');
    api.command.send('odrygluj drzwi');
    api.command.send('odsun zasuwe');
    api.command.send('otworz drzwi');
    return true;
  });

  // szcz - squeeze through a crack
  api.aliases.register(/^szcz$/, () => {
    api.command.send('przecisnij sie przez szczeline');
    return true;
  });

  // przec - squeeze through (generic)
  api.aliases.register(/^przec$/, () => {
    api.command.send('przecisnij sie');
    return true;
  });

  // lyspr - light lamp, sp, extinguish
  api.aliases.register(/^lyspr$/, () => {
    api.command.send('zapal lampe');
    api.command.send('sp');
    api.command.send('zgas lampe');
    return true;
  });

  // lyspr2 - light candle, sp, extinguish
  api.aliases.register(/^lyspr2$/, () => {
    api.command.send('zapal swiece');
    api.command.send('sp');
    api.command.send('zgas swiece');
    return true;
  });

  // pdz - swim to body
  api.aliases.register(/^pdz$/, () => {
    api.command.send('podplyn do zwlok');
    return true;
  });

  // pdk - swim to branch
  api.aliases.register(/^pdk$/, () => {
    api.command.send('podplyn do konara');
    return true;
  });

  // pdp - swim to trunk
  api.aliases.register(/^pdp$/, () => {
    api.command.send('podplyn do pnia');
    return true;
  });

  // pal! - try to set a hut on fire
  api.aliases.register(/^pal!$/, () => {
    api.command.send('zapal swiece');
    api.command.send('podpal chate swieca');
    api.command.send('zgas swiece');
    api.command.send('podpal chate pochodnia');
    api.command.send('podpal chate lampa');
    return true;
  });

  // wzb - jump overboard and check gps
  api.aliases.register(/^wzb$/, () => {
    api.command.send('wyskocz za burte');
    api.command.send('gps');
    return true;
  });

  // kigge - board ship, loot, disembark
  api.aliases.register(/^kigge$/, () => {
    api.command.send('wejdz na statek');
    api.command.send('wejdz na statek');
    api.command.send('sp');
    api.command.send('wez wszystko');
    api.command.send('zejdz ze statku');
    api.command.send('zejdz ze statku');
    return true;
  });

  // qk - lift grate/slab/hatch
  api.aliases.register(/^qk$/, () => {
    api.command.send('podnies krate');
    api.command.send('podnies plyte');
    api.command.send('podnies klape');
    return true;
  });

  // ods! - push slab aside
  api.aliases.register(/^ods!$/, () => {
    api.command.send('odsun plyte');
    return true;
  });

  // obsa - examine sarcophagus
  api.aliases.register(/^obsa$/, () => {
    api.command.send('ob sarkofag');
    return true;
  });

  // osa - open sarcophagus
  api.aliases.register(/^osa$/, () => {
    api.command.send('otworz sarkofag');
    return true;
  });

  // zsa - close sarcophagus
  api.aliases.register(/^zsa$/, () => {
    api.command.send('zamknij sarkofag');
    return true;
  });

  // xblav - Blav puzzle sequence
  api.aliases.register(/^xblav$/, () => {
    api.command.send('ob gryfa');
    api.command.send('pociagnij jezyk');
    api.command.send('ob wglebienia');
    api.command.send('ob mozaike');
    api.command.send('wcisnij kafelek');
    api.command.send('przekrec rubin');
    api.command.send('ob sarkofag');
    return true;
  });

  // xblekitni - lever puzzle (Blekitnokrwisci)
  api.aliases.register(/^xblekitni$/, () => {
    api.command.send('opusc pierwsza wajche');
    api.command.send('opusc druga wajche');
    api.command.send('opusc trzecia wajche');
    api.command.send('podnies trzecia wajche');
    api.command.send('podnies druga wajche');
    api.command.send('opusc trzecia wajche');
    api.command.send('podnies pierwsza wajche');
    api.command.send('opusc druga wajche');
    api.command.send('podnies trzecia wajche');
    api.command.send('podnies druga wajche');
    return true;
  });

  // xdru - examine stone slabs puzzle (Druids?)
  api.aliases.register(/^xdru$/, () => {
    for (let i = 1; i <= 6; i++) {
      const ordinals = ['pierwsza', 'druga', 'trzecia', 'czwarta', 'piata', 'szosta'];
      api.command.send(`ob ${ordinals[i - 1]} plyte`);
    }
    api.command.send('ob runy');
    return true;
  });
}
