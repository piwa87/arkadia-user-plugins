import type { PluginApi } from '@arkadia/plugin-types';

function entry(api: PluginApi, command: string, description: string): void {
  api.output.print(` <dodger_blue>${command} <grey>- ${description}`);
}

export function setupHelp(api: PluginApi): () => void {
  api.aliases.register(/^ra?$/, () => {
    api.output.print('\n<yellow>Aliasy do kategorii pomocy pluginu:\n');
    entry(api, '/ra_pomoc_aliasy', 'dostepne aliasy uzytkowe');
    entry(api, '/ra_pomoc_klucze', 'dostepne aliasy dla kluczodajek');
    entry(api, '/ra_pomoc_kupiec', 'dostepne aliasy dla obslugi sprzedawania, monet, historii sprzedazy');
    entry(api, '/ra_pomoc_ziola', 'dostepne aliasy do obslugi ziol');
    entry(api, '/ra_pomoc_czas', 'dostepne aliasy o informacjach kalendarzy');
    entry(api, '/baza_kamieni', 'wyswietla liste znanych kamieni i ich wlasciwosci');
    entry(api, '/flakoniki', 'wyswietla liste znanych magicznych flakonikow i ich wlasciwosci');
    entry(api, '/ra_zlecenia', 'wyswietla liste aktualnych zlecen');
    return true;
  });

  api.aliases.register(/^\/ra_pomoc_aliasy$/, () => {
    api.output.print('<yellow>\nAliasy ogolne:\n');
    entry(api, '/jadalnia_ra', 'jedzenie w jadalni');
    entry(api, '/razm', 'pytanie o zmeczenie teamu');
    entry(api, '/plaszcze', 'sprawdza kto w druzynie nie ma kaptura');
    entry(api, '/kup_bilety', 'kupuje bilety dla czlonkow druzyny');
    entry(api, '/zapr', 'zaprasza wszystkich na lokacji nie bedacych w druzynie');
    entry(api, '/odloz_magie_ra', 'odklada odpowiednia magie do odpowiedniej skrzyni');
    entry(api, '/woz', 'pokazuje aktualne informacje o wozie');
    entry(api, '/zaslon+', 'wlacza puszczanie zaslon po rozkazach');
    entry(api, '/zaslon-', 'wylacza puszczanie zaslon po rozkazach');
    entry(api, '/ddaj <przedmiot>', 'daje przedmiot kazdemu w druzynie');
    entry(api, '/ddajz <zloto>', 'daje zloto kazdemu w druzynie');
    entry(api, '/czas_walki', 'pokazuje czas trwania walki');
    entry(api, '/teleskop', 'pokazuje rozpoznane gwiazdozbiory');
    entry(api, '/teleskop_sprawdz', 'automatyczne skanowanie wszystkich kierunkow przez teleskop');
    entry(api, '/ustaw_astrolabium', 'ustawia astrolabium na podstawie rozpoznanych gwiazdozbiorow');
    entry(api, '/bretonia', 'automatyczna eksploracja Bretonii');
    return true;
  });

  api.aliases.register(/^\/ra_pomoc_klucze$/, () => {
    api.output.print('<yellow>\nAliasy kluczodajek:\n');
    entry(api, '/klucze', 'pokazuje kluczodajki w poblizu');
    entry(api, '/klucze!', 'pokazuje wszystkie znane kluczodajki');
    entry(api, '/klucze_szukaj <fraza>', 'szukaj kluczodajki po nazwie');
    entry(api, '/klucze_dodaj', 'dodaje zabicie kluczodajki');
    entry(api, '/klucze_lista', 'lista kluczy z info o wygasnieciu');
    return true;
  });

  api.aliases.register(/^\/ra_pomoc_kupiec$/, () => {
    api.output.print('<yellow>\nAliasy kupieckie:\n');
    entry(api, '/mpokaz <procent>', 'pokazuje procent z ostatniej transakcji');
    entry(api, '/mwloz <procent> <pojemnik>', 'wklada procent do pojemnika');
    entry(api, '/mustaw <procent>', 'ustawia procent kosztu bankowego');
    entry(api, '/musun_historie', 'czysci historie sprzedazy');
    return true;
  });

  api.aliases.register(/^\/ra_pomoc_ziola$/, () => {
    api.output.print('<yellow>\nAliasy ziolowe:\n');
    entry(api, '/dolegliwosci', 'pokazuje antidota ktore posiadasz');
    entry(api, '/dolegliwosci!', 'pokazuje wszystkie dostepne antidota');
    entry(api, '/trad', 'ziola dostepne na handlarzu');
    return true;
  });

  api.aliases.register(/^\/ra_pomoc_czas$/, () => {
    api.output.print('<yellow>\nAliasy kalendarzowe:\n');
    entry(api, '/czas', 'nastepne wydarzenia');
    entry(api, '/czas+', 'wydarzenia w calym roku');
    entry(api, '/czas_imperium', 'czas dla domeny imperium');
    entry(api, '/czas_ishtar', 'czas dla domeny Ishtar');
    entry(api, '/now', 'aktualny czas w grze');
    return true;
  });

  return () => {};
}
