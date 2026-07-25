/**
 * The accepted club nouns ("dopuszczone rzeczowniki"), the full set the game
 * offers as of the capture below — every category listed once via `wyswietl`.
 *
 * This replaces CMud's `rkgNazwy`, which the export had reduced to a single
 * `zastepca` — itself a leadership title, not an accepted noun, so the dialogue
 * would have rejected it. The pool changes rarely, so `rkg!` answers the noun
 * prompt directly from this base rather than walking the category sub-menus on
 * every run. The base is fixed in code — edit this file to extend it.
 *
 * Kept grouped by category (verbatim game output) so it stays diffable when the
 * MUD adds a noun. The lists are flattened and de-duplicated below — several
 * nouns appear in more than one category (e.g. `diadem`, `granat`, `okulary`,
 * `poziomka`, `winogrono`, `malina`, `los`, `pierscien`).
 */
const KATEGORIE_RZECZOWNIKI: Record<string, string> = {
  abstrakcyjne:
    'ballada, dobro, klatwa, los, moc, mysl, nieszczescie, opowiesc, piesn, plaga, poezja, prawda, przeznaczenie, smierc, szczescie, wybor, wynalazek, zlo, zmiana i zycie',
  astronomiczne:
    'blyskawica, chmura, gwiazda, kometa, ksiezyc, meteor, mgla, polksiezyc, slonce, swit, tecza i zmierzch',
  bestie:
    'bazyliszek, bestia, gryf, harpia, jednorozec, mantikora, oszluzg, pegaz, potwor, smok, widlogon, wilkolak, wyverna, zagnica i zyrytwa',
  bronie:
    'bat, berdysz, berlo, bosak, bulat, bulawa, buzdygan, cep, ciupaga, claymore, czekan, daga, espadon, flamberg, floret, gizarma, glewia, gwozdz, halabarda, igla, jatagan, katzbalger, kij, kilof, kiscien, koncerz, korbacz, kord, kordelas, kosa, kostur, lanca, lewak, lopata, maczuga, miecz, mizerykordia, mlot, mlotek, morgenstern, multon, nadziak, naginata, nimsza, noz, obuszek, oskard, ostrze, palasz, palka, partyzana, pika, pila, poltorak, puginal, rapier, runka, siekiera, sierp, spisa, strzala, szabla, szamszir, szpadel, szponton, sztandar, sztylet, talwar, tasak, topor, toporek, trojzab, wekiera, widly i wlocznia',
  'czesci ciala':
    'brzuch, czaszka, dlon, dziob, glowa, jezyk, kiel, kosc, noga, nos, oko, osc, palec, piesc, piszczel, ramie, reka, serce, skora, skrzydlo, stopa, szpon i ucho',
  'figury geometryczne':
    'kolo, krokiew, krzyz, kula, kwadrat, lekawica, ostrza, pal, pierscien, polkolo, prostokat, raut, runa, stozek, trojkat i walec',
  instrumenty: 'beben, cymbaly, dudy, flet, fletnia, lira, lutnia i rog',
  kamienie:
    'agat, akwamaryn, aleksandryt, almandyn, ametyst, apatyt, awenturyn, azuryt, brylant, bursztyn, celestyn, chryzoberyl, chryzopraz, cyrkon, cytryn, diament, diopsyd, fluoryt, gagat, granat, heliodor, hematyt, iolit, jaspis, karneol, krysztal, kwarc, kyanit, labrador, lazuryt, malachit, monacyt, nefryt, obsydian, oliwin, onyks, opal, ortoklaz, perla, piryt, rodochrozyt, rodolit, rubin, serpentyn, spinel, szafir, szmaragd, topaz, turkus, turmalin, tytanit i zoisyt',
  miejsca:
    'chata, dom, droga, forteca, gora, gosciniec, gospoda, granica, grod, jama, jaskinia, jezioro, kamienica, kopalnia, miasto, przystan, rzeka, sciezka, staw, strumien, swiatynia, szlak, wies, wieza, wyspa, wzgorze, zamek, zamtuz i zaulek',
  pojazdy: 'bryczka, dylizans, kareta, karoca, powoz, woz i wozek',
  postacie:
    'adept, adeptka, baba, berserker, bog, bogini, bostwo, chochlik, czarodziej, czarodziejka, czlowiek, demon, driada, duch, dziad, elf, elfka, faun, ghul, gigant, gnom, gnomka, goblin, golem, goniec, halfling, halflinka, kaplan, kobieta, kosciotrup, krasnolud, krasnoludka, lowca, mezczyzna, minotaur, niziolek, niziolka, ogr, ogrzyca, ozywieniec, polelf, polelfka, ryboczlek, rycerz, sierota, skaven, straznik, syrena, szkielet, troll, upior, utopiec, wampir, widmo, wiedzma, wiedzmin, wisielec, wloczega, wodnik, wojowniczka, wojownik, zabojca, zebrak, zjawa, zlodziej, zmora i zolnierz',
  ptaki:
    'albatros, bazant, bocian, czapla, drozd, dzierzba, feniks, ges, golab, golebica, indyk, jaskolka, jastrzab, kaczka, kogut, krogulec, kruk, kura, kurczak, kuropatwa, maskonur, mewa, nietoperz, orzel, ptak, ptaszyna, sep, sokol, sowa, sroka, wrobel, wrona i zuraw',
  rosliny:
    'brzoza, buk, ciern, dab, drzewo, galaz, galazka, glog, grusza, jablon, jarzebina, jesion, jodla, kasztan, kolec, koniczyna, korzen, krzew, kwiat, lilia, lisc, malina, mech, modrzew, nasionko, olcha, owoc, palma, paproc, porost, poziomka, roza, sosna, swierk, szalwia, tulipan, wierzba, winogrono, zboze, ziolo i zoladz',
  ryby: 'delfin, karp, kraken, losos, okon, potwor morski, rekin, ryba, sandacz, sum, szczupak, wegorz i wieloryb',
  statki: 'drakkar, galeon, galera, karaka, karawela, lodka, lodz, statek, tratwa i zaglowiec',
  ubrania:
    'apaszka, bluza, bransoleta, brosza, but, buty, calun, chusta, cizemka, czapka, diadem, fartuch, futro, kaftan, kamizelka, kapelusz, kaptur, kolczyk, koszula, kurtka, maska, medalion, mufka, muszka, naszyjnik, obraczka, okulary, opaska, pas, peruka, pierscien, pierscionek, plaszcz, pled, rekawiczka, rekawiczki, sandaly, spinka, spodnica, spodnie, sukienka, suknia, sygnet, szal, szata i tunika',
  zbroje:
    'aketon, diadem, helm, kapalin, kirys, kolczuga, korona, lebka, napiersnik, naplecznik, naramiennik, pawez, przeszywanica, przylbica, puklerz, skorznia, szyszak, tarcza i zbroja',
  zwierzeta:
    'aligator, baran, bobr, borsuk, byk, chrabaszcz, cielak, dzik, foka, gronostaj, hiena, jaszczur, jaszczurka, jelen, jez, kon, kot, koza, koziol, krab, krolik, krowa, lampart, lasica, lew, lis, los, mrowka, mysz, niedzwiedz, norka, nornica, owca, pajak, pantera, pchla, pies, rys, sarna, skorpion, stonoga, susel, swinia, swistak, szczur, szop, tur, tygrys, waz, wesz, wielblad, wiewiorka, wilk, wol, zaba, zajac, zmija i zubr',
  zywnosc:
    'agrest, ananas, arbuz, baklazan, brokul, brzoskwinia, bulka, burak, cebula, chleb, cukinia, cytryna, czeresnia, daktyl, dynia, figa, granat, grejpfrut, gruszka, jablko, jagoda, jajo, jezyna, kalafior, kalarepa, kapusta, kawa, kielbasa, kiwi, maka, malina, mandarynka, mango, marchew, melon, morela, ogorek, oliwa, opuncja, papaja, papryka, pietruszka, pomarancza, pomidor, por, porzeczka, poziomka, rzodkiewka, salata, seler, ser, sliwka, slonecznik, szparag, szynka, truskawka, winogrono, wisnia i ziemniak',
  inne:
    'balia, beczka, beczulka, brama, buklak, cien, drzwi, dywan, dzban, fajka, fala, garnek, garniec, glaz, globus, haczyk, hak, jedwab, kamien, karta, kielich, klatka, klucz, kociol, kosz, kotwica, kowadlo, krata, ksiazka, ksiega, kufel, kufer, kulka, lina, list, lusterko, lza, manekin, moneta, mur, muszla, nagrobek, nozyce, obelisk, ogien, ognisko, okulary, pergamin, piasek, plecak, plomien, pochodnia, podkowa, portal, puchar, pudelko, sakiewka, sakwa, skrzynia, srubka, sznur, szubienica, torba, trakt, trup, trzos, waga, wedka, wiadro, wioslo, wodospad, wrota, zwierciadlo i zwloki',
};

/** Parse one "a, b, c i d" category line into its individual nouns. */
function parsujKategorie(linia: string): string[] {
  return linia
    .split(/\s*,\s*/)
    .flatMap((czesc) => czesc.split(/\s+i\s+/))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const RZECZOWNIKI_SEED: string[] = [
  ...new Set(Object.values(KATEGORIE_RZECZOWNIKI).flatMap(parsujKategorie)),
];
