import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { megaphone } from '../aliases/mgfn';
import { setBind } from '../aliases/f';

const TAG = 'colEventy';

export function setupColEventy(api: PluginApi): void {
  const c4 = getAnsiFormatState(4, api);
  const c6 = getAnsiFormatState(6, api);
  const c34 = getAnsiFormatState(34, api);
  const c35 = getAnsiFormatState(35, api); // %ansi(3,2) = fg3 bg2 → idx 35; also %ansi(35)
  const c38 = getAnsiFormatState(38, api);
  const c43 = getAnsiFormatState(43, api);
  const c62 = getAnsiFormatState(62, api);
  const c67 = getAnsiFormatState(67, api);
  const c99 = getAnsiFormatState(99, api);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const col = (line: any, c: any) => line.color([0, line.text.length], c);

  const say = (text: string, c: ReturnType<typeof getAnsiFormatState>) => {
    const buf = new api.AnsiAwareBuffer(text);
    buf.color([0, text.length], c);
    api.output.print(buf);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prependLabel = (line: any, label: string, labelColor: any, lineColor?: any) => {
    if (lineColor) line.color([0, line.text.length], lineColor);
    const buf = new api.AnsiAwareBuffer();
    buf.append(label, labelColor);
    // Prepend the space onto the line (not into the colored buffer) so it
    // renders with default terminal color rather than inheriting labelColor's background.
    line.prepend(' ');
    return line.prependBuffer(buf);
  };

  // --- Megaphone announces (data-driven) ---

  const ANNOUNCES: [RegExp, string][] = [
    [/Marynarze sciagaja trap i fusta odbija od brzegu, kierujac sie ku pelnemu morzu\./, 'piraci sobie odplyneli'],
    [/Ciemnosc gestnieje wokol .* upiora!/, 'ciemnosc'],
    [/^Zaalarmowani zolnierze pojawiaja sie, aby wesprzec towarzysza\./, 'zwalilo sie wojsko'],
    [
      /.* raptownie odskakuje do tylu, w kilku krokach dobiega do rzezbionego kredensu, odsuwa go i znika w ziejacym chlodem przejsciu\./,
      'igor zwial',
    ],
    [/Tegi gluchy mezczyzna ciezko dyszac ucieka na wschod\./, 'klucznik zwial'],
    [
      /Gladka tafla jeziora zaciaga sie nagle siecia zmarszczek, po czym, spietrzajac sie gwaltownie przy brzegu, wyrzuca z siebie obslizgle cielsko olbrzymiego stwora\./,
      'kraken obecny',
    ],
    [/^Z sufitu opuszczaja sie kolejne pajaki\./, 'pajaczki, wiecej pajaczow!'],
    [/stwor wywijajac na wszystkie strony dlugimi mackami zanurza sie w wodzie jeziora i odplywa\./, 'kraken zwial'],
    [/^Niematerialne uderzenie pozbawia cie na moment tchu\./, 'bruxa przywalila'],
    [/^Kultysci rozchodza sie, znikajac miedzy drzewami\./, 'kultysci zwiali'],
    [/.*przeciera dlonia wypisany kreda symbol i po chwili nie zostaje po nim sladu\./, 'symbol starty'],
    [
      /Rozmyta wysmukla zjawa kobiety sklada rece w krzyz na piersiach i powoli zsuwa je do siebie, zamykajac dlonie w piesci. Po chwili, gwaltownym ruchem wyrzuca rece w twoim kierunku, wypuszczajac z ich wnetrza migotliwy pyl, ktory wpada ci w oczy.*/,
      'blaviken slepota',
    ],
    [/Obumierajaca ziemia wokol .* wysysa energie ze wszystkiego co zyje, w tym i ciebie!/, 'upior jeb'],
    [
      /^Zelezce twojego zasniedzialego obosiecznego topora wybucha nagle oslepiajacym swiatlem, ktore porownac mozna tylko do blasku tysiacy gwiazd migocacych na nocnym niebie. Gdy bron wygasa, w niczym nie przypomina juz starego, zasniedzialego oreza, jakim byla jeszcze przed chwila\./,
      'gwiazdka rozpalona',
    ],
    [
      /^.*gnomka wypada z kokonu i laduje z hukiem na podlodze. Po krotkiej chwili dezorientacji zrywa sie jednak na nogi i jednym susem zeskakuje w dol przez otwor wiodacy na nizsze pietro, momentalnie znikajac ci z oczu\./,
      'gnomka uwolniona',
    ],
    [
      /^Nagly powiew lodowatego powietrza sprawia, ze plomienie swiec przygasaja... by po krotkiej chwili rozblysnac blaskiem podwojnie intansywnym, ktory zdaje sie padac prosto na stojaca na srodku pomieszczenia demonice!/,
      'demonica obecna',
    ],
    [
      /Na samym srodku posadzki znajduje sie obramowana blyszczacym, krwistoczerwonej barwy kamieniem, studnia. Saczy sie z niej demoniczne, czerwone swiatlo, rzucajace ulotne blyski na sciany komnaty i zdobiace je plaskorzezby./,
      'studnia',
    ],
    [
      /^Powierze wokolo zaczyna ciemniec, zmieniajac sie w nieprzejrzysty opar. Gdy dym sie rozwiewa zauwazasz blada wyniosla kobiete./,
      'minerwa obecna',
    ],
    [
      /.* krzyzuje rece na piersi, po czym zaczyna stawac sie coraz bledsza, prawie przejrzysta i w koncu znika!/,
      'minerwa sie rozplynela',
    ],
    [
      /Szkaradny przygarbiony mezczyzna wyciaga reke w strone ciala .* i mamrocze jakies mroczne slowa. Po chwili zwloki rozdymaja sie i pekaja, rozrzucajac wokol gnijace wnetrznosci,/,
      'nekromata jeb',
    ],
    [/^Z peknietej kulki z sykiem wydobywaja sie kleby gestego, czarnego dymu!/, 'kulka zostala rzucona'],
  ];

  for (const [pattern, msg] of ANNOUNCES) {
    api.triggers.register(
      pattern,
      (line) => {
        megaphone(api, msg);
        return line;
      },
      TAG,
    );
  }

  // --- Danger alerts: color line + play_ding (data-driven) ---

  const ALERTS: RegExp[] = [
    /.*zaglebienie w piasku zbliza sie w twoim kierunku!/,
    /^Cos zbliza sie do ciebie przez pobliskie szuwary!/,
    /^Slyszysz glosny skowyt, a po chwili dostrzegasz sylwetke jakiegos skrzydlatego potwora, lecacego prosto w twoja strone!/,
    /^Powietrze zaczyna lekko drgac, ksztalty nieco zamazuja sie\.\.\./,
  ];

  for (const pattern of ALERTS) {
    api.triggers.register(
      pattern,
      (line) => {
        api.command.send('play_ding');
        return col(line, c38);
      },
      TAG,
    );
  }

  // --- Weather events ---

  const burzaOnBanner = () => {
    api.output.print('');
    say('              BURZA PIASKOWA - ON!!!', c4);
    api.output.print('');
  };

  api.triggers.register(
    /Ogarnia cie burza piaskowa(?:\.|!)/,
    (line) => {
      burzaOnBanner();
      return line;
    },
    TAG,
  );
  api.triggers.register(
    /W mgnieniu oka przybierajace na sile podmuchy wiatru podrywaja w gore tumany piachu i kurzu\. Otacza cie burza piaskowa!/,
    (line) => {
      burzaOnBanner();
      return line;
    },
    TAG,
  );
  api.triggers.register(
    /(?:Wiatr zwalnia nieco, a klebiace sie dookola ciebie tumany piachu i pylu powoli osiadaja na ziemi\.|Opuszczasz obszar ogarniety burza piaskowa\.|Burza piaskowa przesuwa sie)/,
    (line) => {
      api.output.print('');
      say('              BURZA PIASKOWA - OFF!!!', c4);
      api.output.print('');
      return line;
    },
    TAG,
  );

  api.triggers.register(
    /(?:Z okolicznych dolin i kotlin bardzo szybko unosi sie biala i gesta mgla\. Widocznosc szybko sie pogarsza, robi sie zimno i wilgotno\.|Wokol ciebie panuje nienaturalny spokoj i cisza, gdy stoisz posrod bialych oblokow mgly, ktore ani mysla ustapic\.)/,
    (line) => {
      say('     MGLA     MGLA      MGLA     MGLA     MGLA     MGLA     MGLA', c35);
      return line;
    },
    TAG,
  );
  api.triggers.register(
    /(?:Gwaltowne podmuchy wiatru rozrywaja gesta mgle wokol ciebie\. Biala sciana zaczyna rzednac by po chwili zniknac zupelnie\.)/,
    (line) => {
      api.command.send('sig Mgla sie rozwiala!');
      return line;
    },
    TAG,
  );

  api.triggers.register(
    'Ponad twoja glowa przelamuje sie potezna sztormowa fala, ktora wciska cie w glebine.',
    (line) => {
      say('           xxx       xxxx       xxxx        xxx     x    xxxx  ', c6);
      say('                          ZATOPILA CIE FALA !!!', c4);
      say('        xxx    xxx    xxxx   xxx      xxxx       xxx       xxxx', c6);
      api.command.send('play_glass');
      return line;
    },
    TAG,
  );

  api.triggers.register(
    /Z ciemnych chmur klebiacych sie nad twoja glowa zaczyna padac snieg, na poczatku powoli, ale z kazda chwila staje sie coraz gestszy\. Po paru minutach przestajesz widziec cokolwiek przez sciane bialego puchu sypiacego sie nieustannie z nieba\./,
    (line) => {
      say('               SNIEZYCA   SNIEZYCA   SNIEZYCA   SNIEZYCA', c35);
      return line;
    },
    TAG,
  );
  api.triggers.register(
    /Szalejaca sniezyca powoli sie uspokaja, przez chwile jeszcze sypie sniegiem ale po krotkim czasie nastepuja cisza i spokoj\. Chmury wciaz klebia sie nad twoja glowa, ale chyba narazie nie zapowiada sie na dalszy ciag nawalnicy\./,
    (line) => {
      say('               SNIEZYCA     KONIEC      SNIEZYCA     SNIEZYCA    SNIEZYCA', c35);
      return line;
    },
    TAG,
  );

  // --- Line substitutions / colorings ---

  // Stunned
  api.triggers.register(
    /Jestes ogluszony i nie mozesz nic zrobic\./,
    (line) => prependLabel(line, '[ zle ]', c38),
    TAG,
  );

  // Empty container — prefix + tint original
  api.triggers.register(/^.* jest zupelnie pust.\./, (line) => prependLabel(line, '[ zle ]', c38, c35), TAG);

  // Spider web immobilization
  api.triggers.register(
    /^.* probuje sie ruszyc na .*, jednak pajecze sieci, w ktore sie .*, uniemozliwiaja.*/,
    (line) => prependLabel(line, '         pajecze sieci        ', c35),
    TAG,
  );

  // Ice sliding — 3rd person (echo 1st-person perspective locally)
  api.triggers.register(
    /^.*probuje isc do przodu, ale sliski lod sprawia, ze wywr.*\./,
    (line) => {
      api.output.print('Probujesz isc naprzod, ale sliski lod sprawia, ze wywracasz sie na nim.');
      return prependLabel(line, '          slizganie           ', c67);
    },
    TAG,
  );

  // Ice sliding — 1st person
  api.triggers.register(
    /^Probujesz isc do przodu, ale sliski lod sprawia, ze wywr.*\./,
    (line) => prependLabel(line, '          slizganie           ', c67),
    TAG,
  );

  // Borowik slipping on wet stones
  api.triggers.register(
    /^Probujesz rozpaczliwie wspiac sie na gore, ale zeslizgujesz sie po mokrych kamieniach\./,
    (line) => prependLabel(line, '          slizganie           ', c67),
    TAG,
  );

  // Denomination
  api.triggers.register(
    /Twoje pieniadze zostaly zdenominowane\./,
    (line) => prependLabel(line, '   DENOMINATION   ', c34),
    TAG,
  );

  // Upior fart (replace line entirely)
  api.triggers.register(
    /^Hipnotyzujacy ulotny upior (?:otwiera niematerialne usta, z ktorych zaczyna|przestaje sie nagle poruszac. Martwa cisza wypelnia|odlatuje na pewna odleglosc od ciebie. Zalobna).*/,
    (line) => {
      const msg = '.....UPIOR PIERDNAL!';
      line.replace([0, line.text.length], msg);
      return line.color([0, msg.length], c35);
    },
    TAG,
  );

  // Max fatigue
  api.triggers.register(/^Jestes tak zmeczon., ze nie mozesz.*w tym kierunku\./, (line) => col(line, c67), TAG);

  // Aggressive plants
  api.triggers.register(
    /(?:Pokoniunkcyjna drapiezna roslina|Pnacy agresywny stwor|Slynna drapiezna roslina|Slynna agresywna roslina|Pokoniunkcyjna agresywna roslina)\./,
    (line) => col(line, c62),
    TAG,
  );

  // --- Heal item triggers (data-driven) ---

  const HEALS: [RegExp, string, ReturnType<typeof getAnsiFormatState>][] = [
    [
      /Widzisz jak ogromny ognisty trojzab przysysa sie na moment do rany, a przez drzewce przebiegaja fale pulsujace w rytmie oszalalego serca napelniajace cie energia\./,
      '  widly lecza  ',
      c34,
    ],
    [/Czujesz jak uzdrawiajaca energia przepelnia twe cialo\./, '  plaszcz leczy  ', c34],
    [/Od twojego amuletu emanuje przyjemne cieplo\./, '  amulet leczy  ', c34],
    [/.*(?:a|to) wydobywajac.* sie z broni.*/, '  spec  ', c43],
  ];

  for (const [pattern, label, c] of HEALS) {
    api.triggers.register(pattern, (line) => prependLabel(line, label, c), TAG);
  }

  // Kruczek sword heal (full-line color)
  api.triggers.register(
    /Nagle kamienie na rekojesci miecza zaczynaja iskrzyc purpurowym swiatlem, zas jego ostrze pokrywa pajeczyna mieniacych sie na czerwono, pulsujacych zylek\. Zdaja sie one plynac lekko po czarnej stali, z kazdym ruchem blask od nich bijacy staje sie coraz bardziej intensywny by w koncu wystrzelic miriada jaskrawoczerwonych, swietlistych okruchow\. Czujesz przyjemne mrowienie gdy jakas magiczna sila przenika przez twoje cialo\./,
    (line) => col(line, c99),
    TAG,
  );

  // --- Earth elemental hit notifications ---

  api.triggers.register(
    /Jedno z nich, zakonczone omszalym glazem trafia wprost w (.*)! Widzisz, jak bezwladnie odrywa sie od ziemi i wymachujac rekami przelatuje dosc spory kawalek, by tam gruchnac o ziemie\./,
    (line) => {
      api.command.send('sig Ktos polecial!');
      return line;
    },
    TAG,
  );
  api.triggers.register(
    /Jedno z nich, zakonczone omszalym glazem trafia wprost w ciebie! Bezwladnie odrywasz sie od ziemi i wymachujac rekami przelatujesz dosc spory kawalek, by gruchnac o ziemie\. Czujesz, jak wszystkie bebechy wywrocily sie w twoim ciele\./,
    (line) => {
      api.command.send('sig Aucik!');
      return line;
    },
    TAG,
  );

  // --- Blacksmith work end ---

  api.triggers.register(
    /^(?:Nie jestes w stanie dluzej czytac|.* konczy prace)\./,
    (line) => {
      api.command.send('play_tink');
      // setBind(api, 'napwsz');
      return col(line, c43);
    },
    TAG,
  );
}
