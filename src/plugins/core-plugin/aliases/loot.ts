import type { PluginApi } from '@arkadia/plugin-types';

export function setupLootAliases(api: PluginApi): void {
  // w1–w20 → take everything from body N
  // m1–m20 → take coins from body N
  // b1–b20 → take weapon from body N
  for (let n = 1; n <= 20; n++) {
    api.aliases.register(new RegExp(`^w${n}$`, 'i'), () => {
      api.command.send(`wez wszystko z ${n}. ciala`);
      return true;
    });

    api.aliases.register(new RegExp(`^m${n}$`, 'i'), () => {
      api.command.send(`wez monety z ${n}. ciala`);
      return true;
    });

    api.aliases.register(new RegExp(`^b${n}$`, 'i'), () => {
      api.command.send(`wez bron z ${n}. ciala`);
      return true;
    });
  }

  // ww0 - strip weapons and armor from 8 bodies
  api.aliases.register(/^ww0$/, () => {
    for (let i = 1; i <= 8; i++) {
      api.command.send(`wez wszystkie bronie z ${i}. ciala`);
      api.command.send('odloz je');
      api.command.send(`wez wszystkie zbroje z ${i}. ciala`);
      api.command.send('odloz je');
    }
    return true;
  });

  // mx[N] → take coins from current location + N bodies (default 5, range 1-20)
  api.aliases.register(/^mx(\d*)$/i, (matches) => {
    const count = matches?.[1] ? Math.min(parseInt(matches[1], 10), 20) : 5;
    api.command.send('wez monety');
    for (let n = 1; n <= count; n++) api.command.send(`wez monety z ${n}. ciala`);
    return true;
  });
}
