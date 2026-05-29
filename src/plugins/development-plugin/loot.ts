import type { PluginApi } from '@arkadia/plugin-types';
import { registerDev } from './devAlias';

export function setupLootAliases(api: PluginApi): void {
  // w1–w8 → take everything from body N
  // m1–m8 → take coins from body N
  // b1–b8 → take weapon from body N
  for (let n = 1; n <= 8; n++) {
    registerDev(
      api,
      new RegExp(`^w${n}$`, 'i'),
      `w${n}`,
      `weź wszystko z trupy #${n}`,
      () => {
        api.command.send(`wezmij wszystko z ${n} trupy`, false);
        return true;
      },
    );

    registerDev(
      api,
      new RegExp(`^m${n}$`, 'i'),
      `m${n}`,
      `weź monety z trupy #${n}`,
      () => {
        api.command.send(`wezmij monety z ${n} trupy`, false);
        return true;
      },
    );

    registerDev(
      api,
      new RegExp(`^b${n}$`, 'i'),
      `b${n}`,
      `weź broń z trupy #${n}`,
      () => {
        api.command.send(`wezmij bron z ${n} trupy`, false);
        return true;
      },
    );
  }

  // mx → take coins from all bodies (mass loot coins)
  registerDev(api, /^mx$/i, 'mx', 'monety ze wszystkich trup (1–8)', () => {
    for (let n = 1; n <= 8; n++) api.command.send(`wezmij monety z ${n} trupy`, false);
    return true;
  });

  // mz → mass loot coins + stones from all bodies
  registerDev(api, /^mz$/i, 'mz', 'monety + kamienie ze wszystkich trup', () => {
    for (let n = 1; n <= 8; n++) {
      api.command.send(`wezmij monety z ${n} trupy`, false);
      api.command.send(`wezmij kamienie z ${n} trupy`, false);
    }
    return true;
  });

  // we <item> → take item from "other" container
  registerDev(
    api,
    /^we\s+(.+)$/i,
    'we <przedmiot>',
    (m) => `weź z pojemnika: ${m?.[1]?.trim() ?? '?'}`,
    (matches) => {
      const item = matches?.[1]?.trim();
      if (item) api.command.send(`/wzp ${item}`);
      return true;
    },
  );

  // wl <item> → put item into "other" container
  registerDev(
    api,
    /^wl\s+(.+)$/i,
    'wl <przedmiot>',
    (m) => `włóż do pojemnika: ${m?.[1]?.trim() ?? '?'}`,
    (matches) => {
      const item = matches?.[1]?.trim();
      if (item) api.command.send(`/wdp ${item}`);
      return true;
    },
  );

  // wem → take coins from current container
  registerDev(api, /^wem$/i, 'wem', 'weź monety z pojemnika (/wem)', () => {
    api.command.send('/wem');
    return true;
  });

  // wlm → put coins into current container
  registerDev(api, /^wlm$/i, 'wlm', 'włóż monety do pojemnika (/wlm)', () => {
    api.command.send('/wlm');
    return true;
  });
}
