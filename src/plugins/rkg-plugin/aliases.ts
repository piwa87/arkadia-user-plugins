import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';
import type { Baza } from './store';
import type { RkgStyles } from './styles';
import { printClubTable } from './presentation';

export function setupAliasy(api: PluginApi, baza: Baza, styles: RkgStyles): void {
  const drukuj = (tekst: string, kolor: FormatStateSnapshot) => {
    const buf = new api.AnsiAwareBuffer(tekst);
    buf.color([0, tekst.length], kolor);
    api.output.print(buf);
  };

  const info = (tekst: string) => drukuj(tekst, styles.info);

  // ── rkg / rkghelp — short help ────────────────────────────────────────────
  const POMOC: [string, string][] = [
    ['rkg!', 'przejdz dialog "utworz klub", losuj nazwe i tytuly, na koncu anuluj'],
    ['rkg-', 'przerwij trwajacy run'],
    ['rkgshow!', 'pokaz zebrane kluby wraz z tytulami wladz'],
    ['rkghof', 'okno RKG: lokalne kluby + ranking online'],
    ['rkgstatus', 'sprawdz, kiedy dzienny slot wysylki bedzie gotowy'],
    ['rkgwyslij [x]', 'wyslij ostatni klub (limit 1 na 24h; x = nick, - = anonimowo)'],
    ['rkgnick <x>', 'ustaw publiczny nick (rkgnick - = anonimowo)'],
    ['rkgnuke -', 'wyczysc tylko lokalna liste; ranking moderuje sie na stronie'],
    ['rkg / rkghelp', 'ta pomoc'],
  ];

  api.aliases.register(/^rkg(?:help)?$/i, () => {
    drukuj('Rendom Klub Dżenerejtor — losowe nazwy klubow (PODGLAD, nie zaklada klubu)', styles.clubName);
    for (const [cmd, opis] of POMOC) {
      const buf = new api.AnsiAwareBuffer('  ');
      buf.append(cmd, styles.action);
      // Explicit color on the plain part — append after a colored append would
      // otherwise inherit the previous color.
      buf.append(`  ${opis}`, styles.info);
      api.output.print(buf);
    }
    return true;
  });

  // ── rkgshow! — the clubs generated so far, with their leadership titles ────
  api.aliases.register(/^rkgshow!$/i, () => {
    if (baza.wpisy.length === 0) {
      info('[rkg] brak zebranych klubow — uzyj rkg!');
      return true;
    }
    for (const w of baza.wpisy) {
      printClubTable(api, styles, w.wynik, w.role ?? {});
    }
    info(`[rkg] razem: ${baza.wpisy.length}`);
    return true;
  });
}
