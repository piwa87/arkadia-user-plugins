/**
 * Adjectives fed into the club-creation dialogue (CMud `rkgPrzymiotniki`),
 * in base form — nominative singular masculine. The game inflects them
 * according to the chosen liczba/przypadek, so `pokretny` can come back as
 * `Pokretnych`; nothing here matches the printed name verbatim.
 *
 * Stored as one pipe-separated blob rather than ~900 quoted strings: it stays
 * diffable, and the parse below trims (the CMud export had stray whitespace)
 * and de-duplicates (`plugawy` appeared twice).
 *
 * The list still contains a handful of adverbs (`mimochodem`, `powoli`,
 * `szczerze`, …) that the CMud list had picked up. They are harmless — the game
 * rejects what it does not accept as an adjective.
 *
 * Otherwise this is the CMud list verbatim MINUS the 8 entries in ZABRONIONE:
 * 970 unique in, 962 out. Names generated here can end up on a public wall, and
 * these are the ones that would eventually produce something nobody wants to
 * see there. The wall's validator rejects them too, by virtue of checking
 * membership of RKG_PRZYMIOTNIKI.
 */

/** Removed from the CMud list — see above. Kept named so the removal is reviewable. */
export const ZABRONIONE: readonly string[] = [
  'nimfomanski',
  'oblesny',
  'obsceniczny',
  'perwersyjny',
  'pozadliwy',
  'rasistowski',
  'sprosny',
  'zberezny',
];
const SUROWE = `
abstrakcyjny|anarchiczny|apodyktyczny|autoironiczny|agresywny|anarchistyczny|apoplektyczny|
autokratyczny|alergiczny|anegdotyczny|arbitralny|automatyczny|aluzyjny|anielski|arogancki|
autorytarny|ambitny|antypatyczny|artystyczny|autorytatywny|ambiwalentny|apatyczny|
arystokratyczny|autystyczny|amoralny|apetyczny|ascetyczny|badawczy|bezladny|blogi|balamutny|
bezlitosny|blyskawiczny|banalny|bezmyslny|blyskotliwy|bandycki|beznadziejny|bogobojny|
beznamietny|bohaterski|bezpieczny|bojazliwy|bezplciowy|bojowy|bezradny|bolesny|bezsilny|boski|
bezbronny|bezszelestny|braterski|bezceremonialny|beztroski|brawurowy|bezczelny|bezwiedny|
brutalny|bezczynny|bezwzgledny|brzydki|bezduszny|biegly|buntowniczy|bezglosny|blady|butny|
bezinteresowny|blagalny|bystry|ceremonialny|chojracki|ciekawski|cudny|chamski|chorobliwy|
cieply|cwaniacki|chaotyczny|chrapliwy|cieplutki|cyniczny|chciwy|chutliwy|cierpiacy|czarowny|
chelpliwy|chwacki|cierpki|czarujacy|chetny|chytrze|cierpliwy|czujny|chlodny|cichy|ciezky|czuly|
chlopiecy|cichutki|ckliwy|chmurny|ciekawy|cudaczny|delikatny|dobitny|doskonaly|dyskretny|
delikatniutki|dobroduszny|dostojny|dystyngowany|demobilizujacy|dobrotliwy|dotkliwy|dziarski|
demoniczny|doceniajacy|dowcipny|dziecinny|demonstracyjny|dociekliwy|dramatyczny|dziekczynny|
denerwujacy|dojmujacy|drapiezny|dzielny|deprecjonujacy|dojrzaly|drazliwy|dziewczecy|
deprymujacy|dokladny|druzgocacy|dziewiczy|desperacki|dokuczliwy|drwiacy|dziki|destruktywny|
dominujacy|dumny|dziwaczny|dezorientujacy|domyslny|durny|dziwny|diabelski|donosny|dworny|
dzwieczny|diaboliczny|dosadny|dwuznaczny|efektowny|ekscentryczny|ekstrawertyczny|
entuzjastyczny|egocentryczny|ekspansywny|elegancki|erotyczny|egoistyczny|ekspresywny|
emocjonalny|euforyczny|egzaltowany|ekstatyczny|energiczny|ezoteryczny|eklektyczny|
ekstrawagancki|enigmatyczny|fachowy|fatalistyczny|filuterny|frapujacy|falszywy|fatalny|
finezyjny|frasobliwy|fanatyczny|figlarny|flegmatyczny|frenetyczny|fantazyjny|filozoficzny|
formalny|frywolny|gapowaty|glupawy|goraczkowy|grubianski|gardlowy|glupi|gorliwy|grzeczny|
gburowaty|glupiutki|gorzki|grzmiacy|genialny|glupkowaty|goscinny|gwaltowny|gleboki|gniewny|
grobowy|glosny|godny|gromki|gluchy|goracy|grozny|halasliwy|harmonijny|hojny|humorystyczny|
hardy|histeryczny|honorowy|idiotyczny|insynuacyjny|introwertyczny|irracjonalny|imponujacy|
intelektualny|intrygujacy|irytujacy|impulsywny|inteligentny|intuicyjny|instynktowny|intensywny|
ironiczny|jadowity|jowialny|kaprysny|kokieteryjny|konwencjonalny|krwiozerczy|karcacy|komiczny|
kordialny|krytyczny|karny|kompetentny|koslawy|krzepiacy|kasliwy|konkretny|koszmarny|krzykliwy|
kataleptyczny|konserwatywny|kpiacy|krzywy|kategoryczny|konspiracyjny|kpiarski|kumoterski|
klamliwy|konstruktywny|kretynski|kunktatorski|klotliwy|konsumpcyjny|krotki|kuszacy|kobiecy|
kontemplatywny|krotochwilny|kwasny|kochajacy|kontrolny|krwawy|ladny|laskawy|lekliwy|logiczny|
lagodny|latwowierny|leniwy|lubiezny|lajdacki|leciutki|litosciwy|lunatyczny|lakomy|lekcewazacy|
lizusowski|lzawi|lakoniczny|lekki|lobuzerski|lapczywy|lekkomyslny|lodowaty|machinalny|marudny|
metny|mimochodem|macierzynski|marzycielski|metodyczny|mimowolny|madrze|masochistyczny|mezny|
mistrzowski|majestatyczny|mdlacy|mglisty|mistyczny|makabryczny|mdly|miarowy|mobilizujacy|
makiaweliczny|medrkowaty|miazdzacy|mocny|malkontentny|megalomanski|miekki|morderczy|malostkowy|
melancholijny|milczacy|mroczny|maniakalny|melodyjny|mily|mrozacy|markotny|meski|milosny|
mrukliwy|marny|metafizyczny|milutki|msciwy|niedwuznaczny|nieprawomyslny|nieumiejetny|
niedyskretny|nieprofesjonalny|nieumyslny|niefortunny|nieprzekonujacy|nieuprzejmy|
niefrasobliwy|nieprzychylny|nieustepliwy|nabozny|niegodziwy|nieprzyjazny|nieuwazny|nachalny|
niegrzeczny|nieprzyjemny|niewinny|nadopiekunczy|niejasny|nieprzystojny|niewolniczy|naglacy|
niejednoznaczny|nieprzytomny|niewprawny|nagly|niekompetentny|nieprzyzwoity|niewygodny|naiwny|
niekonkretny|nierozsadny|niewyrazny|nalogowy|niekontrolowany|nierozwazny|niezauwazalny|
namietny|niekonwencjonalniy|niesamowity|niezawodny|nastrojowy|niemadrze|nieskromny|niezdarny|
natarczywy|niemily|niesmialy|niezdecydowany|naturalny|niemilosierny|niespieszny|niezdrowy|
necacy|niemoralny|niespodziewany|niezgrabny|nedzny|niemrawy|niespokojny|nieznaczny|nerwowy|
nienaturalny|niestosowny|nieznosny|neurasteniczny|nienawistny|nieswiadomy|niezobowiazujacy|
neurotyczny|nieobliczalny|niezreczny|niebezpieczny|nieodpowiedni|niesympatyczny|niezrozumialy|
niecenzuralny|nieodpowiedzialny|nieszczerze|niezyczliwy|niechcacy|nieoficjalny|nieszczesliwy|
nikczemny|niechetny|niepewny|nieszkodliwy|niechlujny|niepochlebny|nietaktowny|nobliwy|
niecierpliwy|niepohamowany|nietypowy|nonszalancki|niedbaly|niepokorny|nieudolny|nosowy|
niedojrzaly|niepoprawny|nieufny|nostalgiczny|niedolezny|nieporadny|nieugiety|nowobogacki|
niedowierzajacy|niepowazny|nieumiarkowany|obcesowy|obszerny|odwazny|optymistyczny|obelzywy|
oceniajacy|oficjalny|oryginalny|obiecujacy|ochoczy|ogledny|orzezwiajacy|oblakanczy|ochryply|
ognisty|oschly|obledny|ociezaly|ohydny|oskarzycielski|oczekujacy|ojcowski|osmielajacy|obludny|
okropny|osobliwy|obmierzly|odkrywczy|okrutny|ostentacyjny|obojetny|odpowiedni|olewczy|ostry|
obrazalski|odpowiedzialny|omdlewajacy|ostrozny|obrazliwy|odpychajacy|oniesmielajacy|
ostrzegawczy|obrzydliwy|odrazajacy|oniryczny|oszczedny|odruchowy|opiekunczy|otwarty|obsesyjny|
odstreczajacy|oporny|oziebly|paranoiczny|podly|powolny|przepiekny|paranoidalny|podniecajacy|
powolutku|przepocieszny|paskudny|podniosly|powsciagliwy|przepokorny|patetyczny|podstepny|
przepraszajacy|pazerny|poetycki|pozegnalny|przerazajacy|pedantyczny|pogardliwy|pozerski|
przerazliwy|perfidny|pogladowy|pracoholiczny|przesadny|pogodny|pracowity|przesliczny|
pesymistyczny|pojednawczy|praktyczny|przesmieszny|pewny|pokorny|prawomyslny|przesmiewczy|
pieczolowity|pokraczny|pretensjonalny|przespieszny|piekny|pokretny|problematyczny|
przeszywajacy|pieprzny|pokrzepiajacy|profesjonalny|przeuroczy|pieszczotliwy|polgebkiem|
promienny|przewidujacy|pijacki|polglosem|proroczy|przewrotny|pikantny|polowiczny|prostacki|
pilny|polprzytomny|prostoduszny|piorunujacy|proszacy|piskliwy|pompatyczny|protekcjonalny|
przezabawny|placzliwy|pomyslowy|prowokacyjny|przezorny|platoniczny|ponaglajacy|prowokujacy|
przyciagajacy|plebejski|ponetny|prozny|przygnebiajacy|plochliwy|prywatny|przyjacielski|plochy|
ponizajacy|przeapetyczny|przyjazny|plomienny|ponury|przeatrakcyjny|przyjemny|plugawy|poprawny|
przebiegly|przykry|porozumiewawczy|przeblagalny|przymilny|plynny|poruszajacy|przebojowy|
przynaglajacy|plytki|porywajacy|przebrzydly|przypadkowy|porywczy|przeciagly|przypochlebny|
pobiezny|posepny|przecudaczny|przytakujacy|poblazliwy|posluszny|przecudny|przytlaczajacy|
pobozny|pospieszny|przecudowny|przytomny|pobudzajacy|posuwisty|przeczacy|przyzwalajacy|
pochlebczy|poszukiwawczy|przedrzezniajacy|przyzwoity|pochlebny|potakujacy|przejmujacy|
przyzywajacy|pochmurny|potepienczy|przekonujacy|psotny|pochopny|potezny|przekorny|
psychodeliczny|pochwalny|potulny|przelotny|psychopatyczny|pociagajacy|potulniutki|przemadrzaly|
psychotyczny|pocieszajacy|potwierdzajacy|przemyslny|purytanski|pocieszny|potworny|przenikliwy|
pusty|pouczajacy|przeobledny|pyszalkowaty|podchwytliwy|powatpiewajacy|przeobludny|pyszny|
poddanczy|powazny|przeobmierzly|pytajacy|podejrzany|powitalny|przeokropny|podejrzliwy|powoli|
przeosobliwy|racjonalny|romantyczny|rozpraszajacy|rubaszny|radosny|rozbrajajacy|rozrzutny|
ruchliwy|raptowny|rozdzierajacy|rozsmieszajacy|rykliwy|rozkazujacy|roztropny|rytmiczny|razny|
rozkoszny|rozumny|rzeczowy|refleksyjny|rozkoszniutki|rozwazny|rzeski|rezolutny|rozpaczliwy|
rozweselajacy|rzetelny|sadystyczny|skwapliwy|sykliwy|samokrytyczny|slaby|sprytny|sympatyczny|
samolubny|slabowity|srodze|systematyczny|samotny|sliczny|srogi|syty|sardoniczny|slodki|
sromotny|szalenczy|sarkastyczny|slodziutki|stanowczy|szaleny|sceptyczny|sloneczny|staranny|
szarmancki|schizofreniczny|slony|starczy|szatanski|scisly|sluzalczy|stary|szczerze|senny|
sluzbisty|stosowny|szczesliwy|sentymentalny|sluzebny|strachliwy|szczodrobliwy|serdeczny|smetny|
straszliwy|szczodrze|smialy|straszny|szelmowski|siarczysty|smiercionosny|strofujacy|szeroki|
silny|smieszny|stronniczy|szlachetny|skandaliczny|smutny|subtelny|szorstki|skapy|soczysty|
suchy|szpetny|sklerotyczny|sowizdrzalski|sugestywny|sztuczny|skoczny|spazmatyczny|sumienny|
sztywny|skromny|spieszny|surowy|szybciutki|skromniutki|swarliwy|szybki|skrupulatny|spokojny|
swiadomy|szyderczy|skryty|spolegliwy|swidrujacy|skrzekliwy|spontaniczny|swietoszkowaty|skrzetny|
sprezysty|swobodny|tajemniczy|tepy|transcendentalny|twardy|taksujacy|teskny|triumfalny|
twierdzacy|taktowny|tolerancyjny|troskliwy|tchorzliwy|tragiczny|trwozny|teatralny|tragikomiczny|
tubalny|uciazliwy|ukradkiem|uporczywy|usluzny|ucieszny|ukradkowy|uprzejmy|uspokajajacy|uczciwy|
umyslny|uragliwy|ustepliwy|uczeny|unizeny|uroczy|uszczypliwy|uczynny|uparty|uroczysty|uwazny|
ufny|upiorny|urzedowy|uwodzicielski|ugodowy|upokarzajacy|usilny|wieloznaczny|wrzaskliwy|wylewny|
wierny|wscibski|wymijajacy|wiernopoddanczy|wsciekly|wymowny|wilkiem|wspanialomyslny|wyniosly|
waleczny|wladczy|wstretny|wyrazny|wariacki|wnikliwy|wstrzasajacy|wyrozumialy|watpiacy|
wnioskujacy|wstrzemiezliwy|wytworny|wdzieczny|wojowniczy|wstydliwy|wyzywajacy|wesoly|wolniutki|
wulgarny|wzgardliwy|wesolutki|wolny|wybredny|wzniosly|wiarolomny|wprawny|wyczekujacy|wiarygodny|
wredny|wygodny|wielkoduszny|wrogi|wykretny|zdawkowy|zdecydowany|zabawny|zabojczy|zaborczy|
zachecajacy|zebrzacy|zachlanny|zgodny|zachwycajacy|zgorzknialy|zaciekly|zgrabny|zacny|zgryzliwy|
zaczepny|zimny|zadziorny|zjadliwy|zagadkowy|zlosliwy|zagorzaly|zlowieszczy|zalosny|zlowrogi|
zalotny|zlowrozbny|zamaszysty|zmyslowy|zapalczywy|znaczacy|zapamietaly|zniechecajacy|zapiekly|
zapraszajacy|zniewalajacy|zaprzeczajacy|zniewiescialy|zarliwy|zreczny|zarloczny|zrozumialy|
zarozumialy|zrzedliwy|zartobliwy|zuchwaly|zasadniczy|zwawy|zasadny|zwierzecy|zastanawiajacy|
zwiezly|zatrwazajacy|zwinny|zawadiacki|zwodniczy|zawistny|zwycieski|zawodowy|zwyczajny|zawziety|
zyczliwy|zazarty|zywiolowy|zazdrosny|zywy|zbywajacy
`;

export const RKG_PRZYMIOTNIKI: string[] = [
  ...new Set(
    SUROWE.split('|')
      .map((slowo) => slowo.trim())
      .filter(Boolean),
  ),
];
