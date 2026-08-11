import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';
import type { Baza } from './store';

export function setupAliasy(api: PluginApi, baza: Baza): void {
  // Colors are built once here, never inside a callback.
  const kolorNazwy = getAnsiFormatState(110, api);
  const kolorRoli = getAnsiFormatState(11, api);
  const kolorInfo = getAnsiFormatState(3, api);
  const kolorCmd = getAnsiFormatState(14, api);

  const drukuj = (tekst: string, kolor: FormatStateSnapshot) => {
    const buf = new api.AnsiAwareBuffer(tekst);
    buf.color([0, tekst.length], kolor);
    api.output.print(buf);
  };

  const info = (tekst: string) => drukuj(tekst, kolorInfo);

  // ── rkg / rkghelp — short help ────────────────────────────────────────────
  const POMOC: [string, string][] = [
    ['rkg!', 'przejdz dialog "utworz klub", losuj nazwe i tytuly, na koncu anuluj'],
    ['rkg-', 'przerwij trwajacy run'],
    ['rkgshow!', 'pokaz zebrane kluby wraz z tytulami wladz'],
    ['rkghof', 'okno RKG: lokalne kluby + ranking online'],
    ['rkgwyslij [x]', 'wyslij ostatni klub (limit 1 na 24h; x = nick, - = anonimowo)'],
    ['rkgnick <x>', 'ustaw publiczny nick (rkgnick - = anonimowo)'],
    ['rkgnuke <klucz>', 'BETA: skasuj caly ranking (rkgnuke - = tylko lokalne)'],
    ['rkg / rkghelp', 'ta pomoc'],
  ];

  api.aliases.register(/^rkg(?:help)?$/i, () => {
    drukuj('Rendom Klub Dżenerejtor — losowe nazwy klubow (PODGLAD, nie zaklada klubu)', kolorNazwy);
    for (const [cmd, opis] of POMOC) {
      const buf = new api.AnsiAwareBuffer('  ');
      buf.append(cmd, kolorCmd);
      // Explicit color on the plain part — append after a colored append would
      // otherwise inherit the previous color.
      buf.append(`  ${opis}`, kolorInfo);
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
      drukuj(w.wynik, kolorNazwy);
      if (w.role?.przywodca) drukuj(`      przywodca: ${w.role.przywodca}`, kolorRoli);
      if (w.role?.zastepca) drukuj(`      zastepca:  ${w.role.zastepca}`, kolorRoli);
      if (w.role?.czlonek) drukuj(`      czlonek:   ${w.role.czlonek}`, kolorRoli);
    }
    info(`[rkg] razem: ${baza.wpisy.length}`);
    return true;
  });
}
