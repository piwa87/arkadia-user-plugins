import type { PluginApi } from '@arkadia/plugin-types';

// ── Colors ───────────────────────────────────────────────────────────────────
const C_HEADER = '#ffd700'; // gold — section headers
const C_CATEGORY = '#aaaaaa'; // silver — category lines
const C_SYNTAX = '#ffd700'; // gold — alias syntax
const C_DESC = '#cccccc'; // light gray — description
const C_FOOTER = '#777777'; // muted — footer

// ── Static alias catalog ─────────────────────────────────────────────────────

interface Entry {
  syntax: string;
  desc: string;
}

interface Section {
  title: string;
  entries: Entry[];
}

const HELP_SECTIONS: Section[] = [
  {
    title: 'Ruch',
    entries: [
      { syntax: 'set_walk', desc: 'tryb chód normalny (moveMode=0)' },
      { syntax: 'set_ride', desc: 'tryb powóz/carriage' },
      { syntax: 'alaz [cel]', desc: 'autopilot: chód do celu (/idz)' },
      { syntax: 'aprze [cel]', desc: 'autopilot: skradanie (prz) do celu' },
      { syntax: 'aprzed [cel]', desc: 'autopilot: skradanie z drużyną do celu' },
      { syntax: 'astop', desc: 'zatrzymaj autopilota (/stop)' },
      { syntax: 'alaz2 / aprze2 / aprzed2', desc: 'wznów autopilota po przerwaniu (/dalej)' },
      { syntax: 'wk1–wk6', desc: 'prędkość autopilota: wk1=wolno … wk6=szybko' },
    ],
  },
  {
    title: 'Walka — GMCP sloty',
    entries: [
      { syntax: '11–99', desc: 'atakuj wroga #N z listy GMCP (podwójna cyfra)' },
      { syntax: '111–999', desc: 'zabij (pełna siła) wroga #N z listy GMCP' },
    ],
  },
  {
    title: 'Walka — akcje',
    entries: [
      { syntax: 'q', desc: 'zaskok (backstab) bieżący cel ataku' },
      { syntax: 'v', desc: 'dobij bieżący cel ataku' },
      { syntax: 'b', desc: 'zablokuj bieżący cel ataku' },
      { syntax: 'bb', desc: 'rozkaz drużynie: zablokuj bieżący cel' },
      { syntax: 'vv', desc: 'zaprzestań zasłaniania' },
      { syntax: 'zp <imię>', desc: 'zasłoń wskazaną postać' },
      { syntax: 'zp1–zp5', desc: 'zasłoń członka drużyny #N (wg listy)' },
      { syntax: 'cca', desc: 'rozkaz drużynie: zaatakuj bieżący cel' },
      { syntax: 'dp', desc: 'kolejkuj wrogów od ostatniego (4→3→2→1)' },
      { syntax: 'bd', desc: 'dodaj wszystkich wrogów do kolejki ataku' },
      { syntax: 'wsk <imię>', desc: 'wskaż postać jako cel ataku' },
      { syntax: 'bbb', desc: 'atakuj + rozkaz drużynie zablokuj cel' },
    ],
  },
  {
    title: 'Tarcza drużyny (siatka 19 pozycji)',
    entries: [
      { syntax: 'qq ww ee rr tt yy uu ii oo pp', desc: 'zasłoń członka drużyny na pozycji 1–10' },
      { syntax: 'aa ss dd ff gg hh jj kk ll', desc: 'zasłoń członka drużyny na pozycji 11–19' },
      { syntax: '<klucz>z', desc: 'rozkaz drużynie: zasłoń tego członka' },
      { syntax: '<klucz>x', desc: 'schowaj się za tego członka drużyny' },
    ],
  },
  {
    title: 'Grabież',
    entries: [
      { syntax: 'w1–w20', desc: 'weź wszystko z trupy #N' },
      { syntax: 'm1–m20', desc: 'weź monety z trupy #N' },
      { syntax: 'b1–b20', desc: 'weź broń z trupy #N' },
      { syntax: 'ww0', desc: 'zdejmij bronie i zbroje z trup 1–8 i odłóż' },
      { syntax: 'mx[N]', desc: 'monety ze wszystkich trup (do N, domyślnie 5)' },
    ],
  },
  {
    title: 'Statystyki',
    entries: [
      { syntax: 'stat', desc: 'statystyki zabić: sesja + całość' },
      { syntax: 'stat2', desc: 'statystyki szczegółowe (/zabici2)' },
      { syntax: 'pos', desc: 'postępy postaci (/postepy)' },
      { syntax: 'pos2', desc: 'postępy szczegółowe (/postepy2)' },
    ],
  },
  {
    title: 'Drużyna',
    entries: [
      { syntax: 'ps', desc: 'przedstaw się' },
      { syntax: 'ws', desc: 'wesprzyj drużynę' },
      { syntax: 'pd', desc: 'porzuć drużynę' },
      { syntax: 'obd', desc: 'obejrzyj drużynę' },
      { syntax: 'pm / pmd', desc: 'przemknij / przemknij z drużyną' },
      { syntax: 'xx / xxb / xxc', desc: 'przestań zasłaniać / blokować / czytać' },
      { syntax: 'xp', desc: 'przerwij bieżącą czynność' },
    ],
  },
  {
    title: 'Opcje',
    entries: [
      { syntax: 'opa / opa0–opa7', desc: 'próg paniki: 0=nigdy … 7=w świetnej kondycji' },
      { syntax: 'przyjm+ / przyjm-', desc: 'włącz / wyłącz przyjmowanie' },
      { syntax: 'op1–op3', desc: 'opisywanie: 1=każdej 2=drużyny 3=swojej' },
      { syntax: 'opi+ / opi-', desc: 'tryb krótki: włącz / wyłącz' },
      { syntax: 'res', desc: 'pokaż odporności' },
    ],
  },
  {
    title: 'Bind (klawisz F)',
    entries: [
      { syntax: 'f+ <cmd>', desc: 'ustaw trwały bind; | rozdziela kilka komend' },
      { syntax: 'f+! <cmd>', desc: 'jednorazowy bind (czyści się po użyciu)' },
      { syntax: 'f', desc: 'wykonaj aktywny bind' },
      { syntax: 'f-', desc: 'wyczyść bind' },
    ],
  },
  {
    title: 'Lampa',
    entries: [
      { syntax: 'la+', desc: 'wyposaż: wyjmij, przytrocz, napełnij, zapal' },
      { syntax: 'la-', desc: 'zdejmij: zgaś, odtrocz, wlóż do torby' },
      { syntax: 'naplam', desc: 'napełnij lampę olejem' },
      { syntax: 'sus', desc: 'zgaś lampę' },
    ],
  },
  {
    title: 'Mieszek',
    entries: [
      { syntax: 'otm', desc: 'otwórz sakiewkę i wyjmij monety' },
      { syntax: 'ztm', desc: 'zamknij sakiewkę' },
      { syntax: 'ztm1', desc: 'posortuj sakiewkę (wytrząśnij miedziaki)' },
      { syntax: 'ztm2', desc: 'wlóż miedziane i srebrne do torby' },
      { syntax: 'zden', desc: 'zdenominuj monety z torby' },
      { syntax: 'zden2', desc: 'zdenominuj monety z ozdobnego plecaka' },
    ],
  },
  {
    title: 'Buklak',
    entries: [
      { syntax: 'buk', desc: 'napij się z buklaka' },
      { syntax: 'buk+ / buk-', desc: 'przytrocz / odtrocz buklak' },
      { syntax: 'buk2', desc: 'szybki łyk: wyjmij, pij, wlóż' },
      { syntax: 'nap', desc: 'napij się do syta wody' },
      { syntax: 'pbuk <imię>', desc: 'odtrocz buklak i daj wskazanej osobie' },
    ],
  },
  {
    title: 'Poczta',
    entries: [
      { syntax: 'pl<N>', desc: 'przeczytaj list #N' },
      { syntax: 'li1–li4', desc: 'listy: 1=nieprzeczytane 2=odebrane 3=wysłane 4=niewysłane' },
    ],
  },
  {
    title: 'Mapa',
    entries: [
      { syntax: 'col1 / col2 / col3', desc: 'zaznacz bieżący pokój różowy / zielony / pomarańczowy' },
      { syntax: 'col0', desc: 'usuń zaznaczenie pokoju' },
      { syntax: '?hl <kolor> [id]', desc: 'zaznacz pokój kolorem; ?hl remove / ?hl clear' },
    ],
  },
  {
    title: 'Zioła',
    entries: [
      { syntax: 'obz', desc: 'zlicz zioła we wszystkich sakwach (/ziola_buduj)' },
      { syntax: 'obzap', desc: 'pokaż stan rezerwy ziół (/ziola_pokaz)' },
      { syntax: 'lec1–lec3', desc: 'weź zioło kategorii 1/2/3 ze skrytki (/wezz)' },
      { syntax: 'lec9', desc: 'użyj wszystkich Lec1 hurtowo (/zi uzyj lec1 99)' },
      { syntax: 'zisort', desc: 'otwórz UI sortowania ziół (/ziola)' },
      { syntax: 'zx', desc: 'przelicz zioła w sakwach (/ziola_buduj)' },
    ],
  },
  {
    title: 'Rybołówstwo',
    entries: [
      { syntax: 'zarz', desc: 'nabij przynętę i zarzuć wędkę' },
      { syntax: 'zatn', desc: 'zaciągnij (zatnij wędkę)' },
      { syntax: 'wsiec', desc: 'wyciągnij sieci i zarzuć ponownie' },
      { syntax: 'spryb', desc: 'otwórz popup wędki (/wedka)' },
    ],
  },
  {
    title: 'Depozyt',
    entries: [
      { syntax: 'depo_set', desc: 'oznacz bieżący pokój jako depozyt (/depozyt_set)' },
      { syntax: 'depo_show', desc: 'zawartość depozytu (/depozyt)' },
      { syntax: 'dep!', desc: 'lista wszystkich depozytów (/depozyty)' },
    ],
  },
  {
    title: 'Zlecenia',
    entries: [
      { syntax: 'zl / zl!', desc: 'zlecenia sklepu (/zlecenia)' },
      { syntax: 'zk / zk!', desc: 'zlecenia karczmy (/zlecenia)' },
      { syntax: 'ea!', desc: 'pokaż statystyki zarobków z dostaw' },
      { syntax: 'eareset', desc: 'resetuj licznik zarobków' },
    ],
  },
  {
    title: 'Wiedza',
    entries: [
      { syntax: 'zg', desc: 'zglebiaj wiedze (bez kategorii)' },
      { syntax: 'zgk <kat> <ks.>', desc: 'zglebiaj wiedze o <kat> z <ks.>' },
      { syntax: 'wd', desc: 'lista wiedzy postaci (/wiedza)' },
    ],
  },
];

// ── Helper ───────────────────────────────────────────────────────────────────

function totalEntries(): number {
  return HELP_SECTIONS.reduce((n, s) => n + s.entries.length, 0);
}

function printLine(api: PluginApi, text: string, color: string): void {
  const buf = new api.AnsiAwareBuffer();
  buf.append(text, api.colors.fromHex(color));
  api.output.print(buf);
}

// ── Setup ────────────────────────────────────────────────────────────────────

export function setupHelpAlias(api: PluginApi): void {
  api.aliases.register(/^\?devhelp$/i, () => {
    printLine(api, '══ Dev Preview — lista aliasów ══════════════════════', C_HEADER);

    for (const section of HELP_SECTIONS) {
      printLine(api, `── ${section.title} ${'─'.repeat(Math.max(0, 46 - section.title.length))}`, C_CATEGORY);

      for (const entry of section.entries) {
        const buf = new api.AnsiAwareBuffer();
        buf.append(`  ${entry.syntax.padEnd(28)}`, api.colors.fromHex(C_SYNTAX));
        buf.append(entry.desc, api.colors.fromHex(C_DESC));
        api.output.print(buf);
      }
    }

    printLine(api, `${'═'.repeat(52)}`, C_HEADER);
    printLine(api, `  ${totalEntries()} grup aliasów · wpisz ?alias aby zobaczyć wszystkie`, C_FOOTER);
    return true;
  });
}
