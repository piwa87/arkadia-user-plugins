# Zioła z CMUD — katalog wiedzy i aliasów

Źródło: [ziola_cmud.xml](ziola_cmud.xml). Analiza samego XML, bez sprawdzania mechaniki w grze. Kategorie według wyjaśnienia użytkownika: **Lec1 = HP**, **Lec2 = boostery cech**, **Reg = regeneracja zmęczenia**, **Odtrutki = odtrutki**. Lec2 zawiera też manę, kaca i panikę; Reg zawiera delionę z osobnym efektem uspokojenia.

Plik zawiera **70 definicji aliasów**: 30 indywidualnych użyć ziół w folderach `A`, 6 zestawów, 1 użycie odtrutki i 33 aliasy pomocnicze. Poniżej komplet. To materiał do późniejszego podpięcia pod system ziół klienta, bez implementacji.

Nazwy i efekty pochodzą z subów, wskazówki o użyciu również z aliasów. Przypisanie do folderu nie dowodzi dokładnego efektu, siły, czasu działania ani skuteczności kombinacji. Ilości to literalne komendy skryptu, a nie ustalone dawki. `—` oznacza brak indywidualnego aliasu w tym XML.

## Zioła leczące HP — Lec1

Opisy w tabelach są formami do rozpoznawania przedmiotów, nie zawsze dokładnym argumentem aliasu.

| Zioło | Opis przedmiotu | Użycie | Alias indywidualny |
| --- | --- | --- | --- |
| Babka | rozetkowate lancetowate liscie | przyloz | `babk` |
| Dziurawiec | czterokanciaste rozgalezione lodygi | rozgryz | `dzi` |
| Komosa | macznistoowlosione szarawe rosliny | przezuj; sub ma `przezuj/zjedz?` | `komos` |
| Lawenda | fioletowe zwarte kwiatostany | zjedz | `lawen` |
| Pięciornik | ciemne poskrecane klacza | rozgryz | `pieci` |
| Głóg | biale male kwiaty | przezuj | `glog` |
| Nagietek | jasnopomaranczowe kwiaty | przyloz | — |
| Barwinek | fioletowe lejkowate kwiaty | przyloz | — |
| Mącznica | zdrewniale rozgalezione krzewinki | rozgryz | — |
| Mniszek | zlocistozolte kwiaty | przezuj | — |
| Mięta | okraglawe aromatyczne liscie | rozetrzyj | — |
| Szałwia | zaostrzone podluzne liscie | przyloz | — |
| Przelot | kremowe owlosione kwiaty / kremowe owlosione ususzone kwiaty | świeże: ususzyć; suszone: sproszkuj | — |
| Posłonek | cienkie kosmate lodyzki | zjedz | — |
| Rdest ptasi | zielone galeziste pedy | przyloz | — |

15 nazw ziół; 16 opisów w `@lec1`, ponieważ przelot występuje świeży i suszony. `lec9` używa wszystkich 15.

## Boostery i pozostałe efekty — Lec2

| Zioło | Opis przedmiotu | Efekt zapisany w subie | Użycie | Alias indywidualny |
| --- | --- | --- | --- | --- |
| Mandragora | biale rozgalezione korzenie | + intelekt | przezuj | `mandr` |
| Ogórecznik | eliptyczne zaostrzone liscie | + odwaga | przezuj | `ogore` |
| Dereń | lsniace czerwone owoce | + wytrzymałość | zjedz | — |
| Casur | maziste bulwiaste grzyby | + siła | zjedz | `casur` |
| Drath | soczyste karminowe mchy | + wytrzymałość | przezuj | `drath` |
| Pokrzywa | kanciaste parzace lodygi | brak wskazania konkretnej cechy | zjedz | `pokrz` |
| Konopie | dlugie lodygi / dlugie ususzone lodygi | brak wskazania konkretnej cechy | ususzyć, następnie spal | — |
| Ranog | zoltoszare niepozorne korzenie / zoltoszare niepozorne ususzone korzenie | brak wskazania konkretnej cechy | przezuj | `ranog` |
| Siężygron (XML: Siezygron) | duze granatowe jagody | brak wskazania konkretnej cechy | rozgryz | `siezy` |
| Świetlik | drobne ukwiecone galazki | + spostrzegawczość | rozgryz | `swiet` |
| Lulek | brudnozolte fioletowo-zylkowane ususzone kwiaty | + intelekt | rozgryz | `lulek` |
| Krasnodrzew | pachnace jasnozielone liscie | + wytrzymałość | powachaj | `krasn` |
| Skedar | ciemne gruzlowate grzyby | brak wskazania konkretnej cechy | zjedz (z aliasu; sub podaje samą nazwę) | `skeda` |
| Buławinka | czarne aromatyczne ziarenka | + mana | przezuj | `bulaw` |
| Kulczyba | dziwne zoltoszare nasionka | + siła | przezuj | — |
| Bieluń | duze biale kwiaty | + zręczność | przezuj; `l2boost` ma powachaj — sprzeczność | — |
| Aralia | szare kolczaste korzenie | + zręczność | przezuj | — |
| Urzet | niepozorne sinozielone roslinki | + odwaga | wetrzyj | — |
| Rosiczka | bialokwitnace drobne roslinki | − kac, − panika | polknij | `rosic` |
| Konwalia | drobne biale kwiatki | − panika (`-pan` w subie) | powachaj | `-pan` |

20 nazw ziół. Sub świeżych konopi jest wyłączony. Ranog ma osobne suby świeżego i suszonego korzenia, ale lista `@lec2` uwzględnia tylko opis bez suszenia.

## Regeneracja zmęczenia — Reg

Efekt kategorii wynika z wyjaśnienia użytkownika. Suby podają przede wszystkim nazwę i sposób użycia.

| Zioło | Opis przedmiotu | Użycie | Alias indywidualny |
| --- | --- | --- | --- |
| Lulecznica | jasnozielone nieowlosione lodygi | przezuj / przyloz | `lulec`, `lulec2` |
| Deliona | zolte jasne kwiaty | zjedz | `del` |
| Naparstnica | srebrzystoszare owlosione liscie | zjedz | `napar` |
| Lak (pisownia XML) | sztywne smukle lodygi | przezuj / rozgryz; zestaw używa przezuj | — |
| Bylica pospolita | kanciaste rozgalezione lodygi | przyloz | `bylic` |
| Kola | brazowe okragle nasionka | rozgryz | — |
| Kasztanowiec | kosmatoowlosione kwiatostany | przyloz | `kaszt` |
| Bobotrutka | czarne blyszczace fasolki | polknij | — |
| Melisa | owlosione aromatyczne liscie | zjedz | — |
| Szczwół | rozdete aromatyczne lodygi | przyloz | `szczw` |
| Nostrzyk | smukle zielone lodygi | przezuj | `nostr` |
| Arnika | zlocistopomaranczowe duze kwiaty | zjedz | `arnik` |
| Podbiał | zolte jaskrawe kwiaty | powachaj | `podbi` |

13 nazw ziół. Deliona ma dodatkowo triggery początku i końca działania. Początek opisuje ustąpienie emocji i maksymalne opanowanie. Nie ma tu liczbowej zmiany cechy ani czasu działania. Nostrzyk figuruje również w pomocy odtrutek na sieciarzy.

## Odtrutki i zastosowania dodatkowe

Źródła: suby `Odtrutki/Suby` oraz tekst wyświetlany przez `trut`. Nazw roślin, których XML nie podaje, nie dopowiadamy.

| Problem | Zioło / opis | Użycie | Dowód / uwaga |
| --- | --- | --- | --- |
| Sieciarze | nostrzyk | przezuj | `trut`; metoda z Reg |
| Pchły | rurkowaty oliwkowobrunatny kwiat | wetrzyj | sub i `trut` |
| Pchły | zolty rurkowaty kwiat | zjedz | sub i `trut` |
| Pchły | brudnobrazowa cuchnaca galazka / brudna cuchnaca galazka | przyloz | sub obejmuje oba opisy; oba są w `@trut` |
| Pluskwy | jasnobrazowa ulistniona lodyga | przyloz | sub, `trut`, alias `uleczsmrod` |
| Pluskwy; ghoule? | galeziasta szaroowlosiona lodyga | wetrzyj | tylko `trut`; ghoule ze znakiem zapytania |
| Pluskwy | dereń | przezuj | pozycja pod Pluskwy w `trut`; dla +wytrzymałości sub podaje zjedz |
| Kergulena | babka, chaber | nie podano w tej wskazówce | `trut`; dla babki Lec1 podaje przyloz |
| Ghoule | jasnobrunatna popekana galazka | przezuj | tylko `trut` |
| Ghoule | biala pachnaca cebulka | zjedz | sub i `trut` |
| Ghoule | zoltawy powyginany korzen | przezuj | tylko `trut` |
| Toksyna roślinna | wysoki blekitny kwiat | przezuj | sub; XML nie łączy wprost tego opisu z chabrem |
| Trąd | lukrecja: sztywne rozgalezione korzenie | przyloz | sub `Lukrecja [trad, przyloz]` |

`@trut` ma tylko 8 opisów. Nie obejmuje wszystkich zastosowań wymienionych w pomocy `trut`; część ziół znajduje się w Lec1/Reg/Lec2, część nie ma tu przypisania do list zakupowych.

## Wszystkie aliasy — użycie pojedynczego rodzaju zioła (31)

Standardowy przebieg: opuść broń → wyjmij z odpowiedniego woreczka → użyj → dobądź broni. `lec1`, `lec2`, `reg` otwierają i zamykają woreczek podczas pobierania. Brak liczby poniżej oznacza brak jawnej liczby w komendzie — nie gwarantowaną dawkę 1.

| Alias | Zioło / źródło | Pobranie → dokładna komenda użycia |
| --- | --- | --- |
| `babk` | babka / Lec1 | `rozetkowaty lisc` → `przyloz rozetkowaty lisc` |
| `dzi` | dziurawiec / Lec1 | `czterokanciasta rozgaleziona lodyge` → `rozgryz czterokanciasta rozgaleziona lodyge` |
| `komos` | komosa / Lec1 | `2 macznistoowlosione szarawe rosliny` → `przezuj 2 macznistoowlosione szarawe rosliny` |
| `lawen` | lawenda / Lec1 | `fioletowy kwiatostan` → `zjedz fioletowy kwiatostan` |
| `pieci` | pięciornik / Lec1 | `poskrecane klacze` → `rozgryz poskrecane klacze` |
| `glog` | głóg / Lec1 | `1 bialy maly kwiat` → `przezuj 1 bialy maly kwiat` |
| `pokrz` | pokrzywa / Lec2 | `parzaca lodyge` → `zjedz parzaca lodyge` |
| `ogore` | ogórecznik / Lec2 | `eliptyczny lisc` → `przezuj eliptyczny lisc` |
| `swiet` | świetlik / Lec2 | `drobna ukwiecona galazke` → `rozgryz drobna ukwiecona galazke` |
| `siezy` | siężygron / Lec2 | `granatowa jagode` → `rozgryz granatowa jagode` |
| `mandr` | mandragora / Lec2 | `bialy korzen` → `przezuj bialy korzen` |
| `rosic` | rosiczka / Lec2 | `drobna roslinke` → `polknij drobna roslinke` |
| `drath` | drath / Lec2 | `karminowy mech` → `przezuj karminowy mech` |
| `ranog` | ranog / Lec2 | `niepozorny korzen` → `przezuj korzen` |
| `krasn` | krasnodrzew / Lec2 | `pachnacy lisc` → `powachaj lisc` |
| `casur` | casur / Lec2 | `mazisty grzyb` → `zjedz mazisty grzyb` |
| `skeda` | skedar / Lec2 | `gruzlowaty grzyb` → `zjedz gruzlowaty grzyb` |
| `bulaw` | buławinka / Lec2 | `czarne ziarenko` → `przezuj czarne ziarenko` |
| `lulek` | lulek / Lec2 | `brudnozolty kwiat` → `rozgryz brudnozolty ususzony kwiat` |
| `-pan` | konwalia / Lec2 | `drobny bialy kwiatek` → `powachaj drobny bialy kwiatek` |
| `bylic` | bylica / Reg | `2 kanciaste rozgalezione lodygi` → `przyloz 2 kanciaste rozgalezione lodygi` |
| `del` | deliona / Reg | `zolty jasny kwiat` → `zjedz zolty jasny kwiat`; potem próba włożenia `zolty jasny kwiat` z powrotem |
| `lulec` | lulecznica / Reg | `2 jasnozielone nieowlosione lodygi` → `przezuj 2 jasnozielone nieowlosione lodygi` |
| `arnik` | arnika / Reg | `zlocistopomaranczowy duzy kwiat` → `zjedz zlocistopomaranczowy duzy kwiat` |
| `napar` | naparstnica / Reg | `2 srebrzystoszare owlosione liscie` → `zjedz 2 srebrzystoszare owlosione liscie` |
| `kaszt` | kasztanowiec / Reg | `2 kosmatoowlosione kwiatostany` → `przyloz 2 kosmatoowlosione kwiatostany` |
| `lulec2` | lulecznica / Reg | `1 jasnozielona nieowlosiona lodyge` → `przyloz jasnozielone nieowlosione lodygi` |
| `szczw` | szczwół / Reg | `2 rozdete aromatyczne lodygi` → `przyloz aromatyczne lodygi` |
| `nostr` | nostrzyk / Reg | `1 smukla zielona lodyge` → `przezuj smukla zielona lodyge` |
| `podbi` | podbiał / Reg | `2 zolte jaskrawe kwiaty` → `powachaj zolte jaskrawe kwiaty` |
| `uleczsmrod` | odtrutka na pluskwy / Zapas | `zap jasnobrazowa ulistniona lodyge` → `przyloz jasnobrazowa ulistniona lodyge` |

Foldery `A` zawierają 30 indywidualnych użyć oraz 3 zestawy: `wyt++`, `l2boost`, `zre++`. Alias `uleczsmrod` pochodzi z folderu Odtrutki.

## Wszystkie aliasy — zestawy (6)

| Alias | Zawartość i zachowanie |
| --- | --- |
| `lec9` | Pobiera po 1 z 15 pozycji `@lec1_use`, po czym wysyła komendy użycia po **2**: głóg, pięciornik, posłonek, dziurawiec, barwinek, lawenda, nagietek, suszony przelot, komosa, mięta, babka, szałwia, mącznica, mniszek, rdest ptasi (w tej kolejności). Włącza `coco`, opuszcza bronie, zamyka woreczek, woła `dob`, po 800 ms wyłącza `coco`. |
| `wyt++` | Drath (`przezuj karminowy mech`) + krasnodrzew (`powachaj lisc`) + dereń (`zjedz lsniacy owoc`). Wyjmuje każdy bez jawnej liczby. Intencja: +wytrzymałość. |
| `zre++` | Bieluń (`przezuj duzy bialy kwiat`) + aralia (`przezuj kolczasty korzen`). Wyjmuje każdy bez jawnej liczby. Intencja: +zręczność. |
| `l2boost` | Aralia (przezuj), bieluń (**powachaj**), drath (przezuj), krasnodrzew (powachaj), dereń (zjedz), casur (zjedz), kulczyba (przezuj), mandragora (przezuj), ogórecznik (przezuj), urzet (wetrzyj) — kolejność użycia. Pobiera 10 rodzajów bez jawnych liczb. Obejmuje zręczność, wytrzymałość, siłę, intelekt, odwagę; nie obejmuje wszystkich ziół Lec2. |
| `reg9` | Bobotrutka (polknij), bylica (przyloz), kasztanowiec (przyloz), melisa (zjedz), szczwół (przyloz), podbiał (powachaj), nostrzyk (przezuj). Pobiera bez jawnych liczb poza podbiałem: `wez 2 zolte jaskrawe kwiay` — literówka w XML. |
| `reg99` | Kola (rozgryz), lulecznica (przezuj), nostrzyk (przezuj), naparstnica (zjedz), lak (przezuj), arnika (zjedz). Pobiera bez jawnych liczb. |

Zestawy opuszczają broń i dobywają jej po użyciu. XML nie dowodzi, że efekty ziół sumują się ani że kolejność jest wymagana. `reg9` i `reg99` to dwa zestawy z jednym wspólnym ziołem (nostrzyk), nie zdefiniowane poziomy siły. Deliona nie jest częścią żadnego z nich.

## Wszystkie aliasy — woreczki, zakupy i techniczne (33)

`<co>` oznacza argument przekazany jako `%-1`.

| Alias | Działanie |
| --- | --- |
| `lec1 <co>` | Otwórz woreczek Lec1, weź wskazane przedmioty, zamknij. Sam nie używa ziół. |
| `lec2 <co>` | Jak wyżej, woreczek Lec2. |
| `reg <co>` | Jak wyżej, woreczek Reg. |
| `zap <co>` | Próbuje wziąć wskazane przedmioty kolejno z 3 woreczków zapasu; nie zatrzymuje się po pierwszym sukcesie. |
| `lec1in` | Wysyła `wloz 4 ...` dla każdego opisu `@lec1` do woreczka Lec1. |
| `lec2in` | Wysyła `wloz 4 ...` dla każdego opisu `@lec2` do woreczka Lec2. |
| `regin` | Wkłada 4 żółte jasne kwiaty, następnie po 4 każdego opisu `@reg` (deliona występuje więc drugi raz). |
| `innein` | Wkłada zioła kolejno do 4 woreczków określonych przez `@w_inne`. |
| `inneout` | Wyjmuje zioła kolejno z tych 4 woreczków. |
| `innein4` | Alternatywna wersja: 4 czarne woreczki, jeśli `@w_inne` jest prawdziwe, inaczej 4 skórzane. |
| `inneout4` | Wyjmowanie według analogicznego warunku czarne/skórzane. |
| `zx` | Skrót do `innein`. |
| `zapin` | Woreczek zapasu 1: Lec1 + Reg; 2: Lec1 + Lec2 + Reg; 3: Lec1 + Lec2 + Reg + Odtrutki. Wkłada według list bez jawnej liczby. |
| `zapregin` | Wkłada Reg do 3. woreczka zapasu. |
| `zaplec1in` | Wkłada Lec1 do 1. i 2. woreczka zapasu. |
| `zaplec2in` | Wkłada Lec2 do 1. i 2. woreczka zapasu. |
| `trutin` | Wkłada opisy z `@trut` do 3. woreczka zapasu. |
| `kuplec` | `otm`, kup po 2 każdego opisu `@lec1`, `lec1in`, `zaplec1in`. |
| `kuplec2` | `otm`, kup po 1 każdego opisu `@lec2`, `lec2in`. `zaplec2in` jest zakomentowane. |
| `kupreg` | `otm`, kup po 2 każdego opisu `@reg`, `regin`, `zapregin`. |
| `kuptrut` | `otm`, kup po 2 każdego opisu `@trut`, następnie **lec1in**, `trutin`. |
| `kupzi` | `otm`, `wyj woreczki`, `kuplec`, `kupreg`, `kuplec2`, następnie `lec1in`, `lec2in`, `regin`, `zapin`. Nie wywołuje `kuptrut`. |
| `spziola` | `inneout`, wyjęcie pokrzyw z Lec2, `lec2in`, następnie `sprzedaj ziola`. Sprzedaje to, co pozostało przy postaci; nie jest selektywną komendą sprzedaży pokrzyw. |
| `zisort` | `wyj woreczki`, `inneout`, `zap ziola`, kolejno `lec1in`, `lec2in`, `regin`, `zapin`, `innein`, z losowymi krótkimi przerwami. |
| `zisort!` | `ot`, `wyj woreczki`, opróżnia Inne, Zapas oraz Lec1/Lec2/Reg; wywołuje każde z `lec1in`, `lec2in`, `regin` dwukrotnie, następnie `zapin`, `innein`. |
| `obz` | Wyłącza suby, zeruje listę/licznik i zagląda do 3 woreczków: Lec1, Lec2, Reg. Triggery składają raport. |
| `obzap` | Jak raport wyżej, dla 3 woreczków zapasu; wcześniej `wyj @w_zapas.1`. |
| `obw [numer]` | Zagląda do woreczka lub wskazanego numeru woreczka; zeruje listę, ustawia licznik na 3, więc odpowiedź może od razu wyświetlić raport. |
| `trut` | Wyświetla ściągę odtrutek. **Nie pobiera i nie używa ziół.** |
| `subyoff` | Wyłącza suby Lec1, Lec2, Reg; nie wyłącza subów Odtrutki. |
| `subyon` | Włącza suby Lec1, Lec2, Reg. |
| `ziolka_sort` | Rozdziela tekst zawartości po przecinkach, „i”, „oraz”; zamienia liczebniki 2–20 na cyfry i „wiele” na `??`. Faktyczne sortowanie jest zakomentowane. |
| `ztest!` | Wysyła bez argumentów: `rozgryz`, `przezuj`, `przyloz`, `spal`, `sproszkuj`, `powachaj`, `rozetrzyj`. Nie jest zestawem leczenia. |

## Niejasności i wskazówki do przyszłego mapowania

- **Bieluń:** `przezuj` w subie i `zre++`, ale `powachaj bialy kwiat` w `l2boost`. Wymaga rozstrzygnięcia przed odwzorowaniem zestawu.
- **Komosa:** sub sam zaznacza niepewność (`przezuj/zjedz?`); oba aliasy używające komosy wybierają `przezuj`.
- **Dereń:** `zjedz` dla +wytrzymałości, ale `przezuj` w pomocy na pluskwy. Możliwe różne zastosowania; XML nie wyjaśnia rozbieżności.
- **Lulecznica i lak:** suby podają po dwie metody. Lulecznica ma osobne aliasy dla obu; lak w zestawie jest przeżuwany. Brak informacji o różnicach efektu.
- **Buławinka:** sub rozpoznaje `ziar...`, alias bierze `czarne ziarenko`, lecz `@lec2` zawiera `czarne aromatyczne ziola`. Potencjalna pomyłka listy zakupów/sortowania.
- **Przelot, lulek, konopie:** ważny stan wysuszenia. `lulek` pobiera opis bez słowa `ususzony`, ale używa suszonego. `lec9` wyjmuje suszony przelot, a proszkuje skrócony opis `kremowe kwiaty`. Brak aliasu automatycznego suszenia.
- **Liczby:** `lec9` bierze po 1 i używa po 2; `lulec2` bierze 1 łodygę, a przykłada opis w liczbie mnogiej. `szczw` i `podbi` pobierają 2, lecz używają liczby mnogiej bez cyfry. Nie przenosić tych różnic jako pewnych reguł dawek.
- **Deliona:** ponowne wkładanie kwiatu po zjedzeniu nie dowodzi wielokrotnego użytku. `regin` próbuje wkładać ją dwukrotnie. Komunikaty opisują uspokojenie, nie potwierdzają samodzielnie regeneracji zmęczenia.
- **Skrócone opisy:** `przezuj korzen`, `powachaj lisc`, `polknij drobna roslinke` mogą wskazać coś innego, jeśli postać trzyma podobne przedmioty. W przyszłym mapowaniu warto rozdzielić pełną tożsamość zioła od historycznego skrótu komendy.
- **Podobne opisy:** `zolte jasne kwiaty` = deliona, `zolte jaskrawe kwiaty` = podbiał, `zolte rurkowate kwiaty` = odtrutka na pchły. `biale male kwiaty` = głóg, `drobne biale kwiatki` = konwalia, `duze biale kwiaty` = bieluń. Bylica ma `kanciaste rozgalezione lodygi`, pokrzywa `kanciaste parzace lodygi`, dziurawiec `czterokanciaste rozgalezione lodygi`.
- **Ogórecznik:** pod jego subem jest komentarz `//niepozorna sinozielona roslinka`, ale osobny sub identyfikuje ten opis jako urzet. Komentarz nie wystarcza do utożsamienia obu ziół.
- **Nieznane zależności:** XML wywołuje `otm`, `ot`, `wyj`, `dob`, ale nie definiuje tych aliasów. Nie zawiera też definicji `w_lec1`, `w_lec2`, `w_reg`, `w_zapas`, `w_inne`; nie da się odtworzyć konkretnych przydziałów woreczków.
- **Raport i efekty:** kolorowane są komunikaty o poprawie zdrowia, mniejszym zmęczeniu/pragnieniu, sytości, większej wytrzymałości i większym pragnieniu. Triggery nie wiążą tych komunikatów z konkretnymi ziołami. Nie można z nich wyprowadzić skutków ubocznych konkretnej rośliny.
- **Zapis `ziolka`:** długa wartość zmiennej jest zapamiętaną zawartością woreczków. Zawiera dodatkowe opisy przedmiotów, ale nie podaje ich nazw ani działania; nie stanowi dodatkowej tabeli efektów.

Do przyszłego połączenia z klientem przydatne będą osobne pola: nazwa zioła, opis/stan (np. suszony), kategoria, jawny efekt, metoda użycia, alias, argument pobrania, argument użycia, zestawy i uwagi o pewności. Ten katalog nie wprowadza jeszcze tych danych do kodu.
