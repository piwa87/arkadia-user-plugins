import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';
import type { Baza } from './store';

export function setupAliasy(api: PluginApi, baza: Baza, odswiezPodswietlenie: () => void): void {
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
    ['rkghof', 'okno Sali Chwaly: wyslij i przegladaj publiczne nazwy'],
    ['rkgnick <x>', 'ustaw publiczny nick (rkgnick - = anonim + cofnij zgode)'],
    ['rkgwall <url>', 'ustaw adres serwera sciany'],
    ['rkgnazwy', 'pokaz baze rzeczownikow'],
    ['rkgnazwy+ <x>', 'dodaj rzeczownik do bazy'],
    ['rkg? / rkg?? / rkg?-', 'rejestrator logu dialogu: start / pokaz / stop'],
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

  // ── rkgnazwy — the noun base the dialogue answers from ────────────────────
  api.aliases.register(/^rkgnazwy$/i, () => {
    info(
      baza.rzeczowniki.length === 0
        ? '[rkg] rzeczowniki: (pusto)'
        : `[rkg] rzeczowniki (${baza.rzeczowniki.length}): ${baza.rzeczowniki.join(', ')}`,
    );
    return true;
  });

  api.aliases.register(/^rkgnazwy\+\s+(.+)$/i, (matches) => {
    const slowo = matches?.[1]?.trim().toLowerCase();
    if (!slowo) {
      info('[rkg] uzycie: rkgnazwy+ <slowo>');
      return true;
    }
    if (baza.rzeczowniki.includes(slowo)) {
      info(`[rkg] juz jest: ${slowo}`);
      return true;
    }
    baza.scalRzeczowniki([slowo]);
    odswiezPodswietlenie();
    info(`[rkg] dodano: ${slowo}`);
    return true;
  });
}
