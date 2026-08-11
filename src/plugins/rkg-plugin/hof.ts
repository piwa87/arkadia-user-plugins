import type { PluginApi } from '@arkadia/plugin-types';
import type { WpisLokalny } from '../../shared/rkg-api';
import { WZORZEC_NICKA } from '../../shared/rkg-grammar';
import { createHofView, type HofView } from './hof-view';
import { createPublisher, formatWait } from './publisher';
import type { Baza } from './store';
import { createRkgStyles } from './styles';
import { createWallClient, WALL } from './wall-client';

/**
 * Coordinates RKG publishing and ranking features.
 *
 * The detailed responsibilities live in focused modules: wall-client owns
 * transport, publisher owns informed upload, and hof-view owns popup rendering.
 */

export interface Hof {
  /** Offer to publish a just-generated club as clickable game output. */
  zaproponuj(wpis: WpisLokalny): void;
  zatrzymaj(): void;
}

export function setupHof(api: PluginApi, baza: Baza, styles = createRkgStyles(api)): Hof {
  const wall = createWallClient();
  const info = (text: string) => api.output.print(`[rkg] ${text}`);
  let view: HofView | null = null;

  const publisher = createPublisher({
    api,
    baza,
    styles,
    wall,
    info,
    onChanged: () => view?.refresh(),
  });
  view = createHofView({
    api,
    baza,
    wall,
    info,
    onSend: publisher.start,
    limitStatus: publisher.limitStatus,
    refreshLimit: publisher.refreshLimit,
  });

  function action(
    buffer: InstanceType<PluginApi['AnsiAwareBuffer']>,
    text: string,
    title: string,
    fn: () => void,
  ): void {
    buffer.append(text, {
      ...styles.action,
      underline: true,
      hyperlink: {
        title,
        onClick: () => {
          try {
            fn();
          } catch {
            // A click handler must never throw into the client's event loop.
          }
        },
      },
    });
  }

  function option(text: string, title: string, fn: () => void): void {
    const buffer = new api.AnsiAwareBuffer('        ', styles.info);
    action(buffer, text, title, fn);
    api.output.print(buffer);
  }

  function rankingLink(): void {
    const buffer = new api.AnsiAwareBuffer('      Link do rankingu: ', styles.info);
    action(buffer, WALL, 'Otworz ranking w przegladarce', () => {
      window.open(WALL, '_blank', 'noopener');
    });
    api.output.print(buffer);
  }

  function zaproponuj(wpis: WpisLokalny): void {
    try {
      const nick = publisher.defaultNick();
      info('Do rankingu mozesz wyslac tylko jeden klub na 24 godziny — wybierz dobrze.');
      info('Opcje:');
      option(
        nick ? `wyslij do rankingu (jako ${nick})` : 'wyslij do rankingu',
        'Pokaz ostatnie potwierdzenie publikacji',
        () => publisher.start(wpis),
      );
      option('nie wysylaj', 'Zostaw tylko lokalnie', () =>
        info('ok — pozniej: rkgwyslij albo rkghof'),
      );
      option('otworz okno lokalnych', 'Pokaz zebrane kluby', () => void view?.open('lokalne'));
      rankingLink();
    } catch {
      info('rkghof — okno z lista klubow, aby wyslac klub do rankingu');
    }
  }

  api.ui.addPopupMenuEntry('RKG', () => void view?.open());
  api.aliases.register(/^rkghof$/i, () => {
    void view?.open();
    return true;
  });

  api.aliases.register(/^rkgstatus$/i, () => {
    void publisher.refreshLimit().then((limit) => {
      if (!limit) {
        info('nie udalo sie sprawdzic dziennego slotu');
      } else if (limit.dostepny) {
        info('dzienny slot jest gotowy — mozesz wyslac jeden klub');
      } else {
        info(`dzienny slot bedzie dostepny za ${formatWait(limit.ponownieZaMs)}`);
      }
    });
    return true;
  });

  api.aliases.register(/^rkgnick(?:\s+(.+))?$/i, (matches) => {
    const arg = matches?.[1]?.trim();
    if (!arg) {
      const nick = publisher.savedNick();
      info(nick ? `nick: ${nick}` : 'nick: (brak, anonimowo). Ustaw: rkgnick <nazwa>');
      return true;
    }
    if (arg === '-') {
      publisher.rememberAnonymous();
      info('nick usuniety — publikujesz anonimowo');
      return true;
    }
    if (!WZORZEC_NICKA.test(arg)) {
      info('nick: 2-16 znakow A-Z, 0-9, _ lub -');
      return true;
    }
    publisher.rememberNick(arg);
    info(`nick ustawiony: ${arg}`);
    return true;
  });

  api.aliases.register(/^rkgwyslij(?:\s+(.+))?$/i, (matches) => {
    const arg = matches?.[1]?.trim();
    const wpis = [...baza.wpisy].reverse().find((entry) => !entry.wyslane);
    if (!wpis) {
      info('nie ma czego wyslac — uzyj rkg!');
      return true;
    }
    if (!arg) {
      publisher.start(wpis);
      return true;
    }
    if (arg === '-') {
      publisher.rememberAnonymous();
      publisher.start(wpis, null);
      return true;
    }
    if (!WZORZEC_NICKA.test(arg)) {
      info('nick: 2-16 znakow A-Z, 0-9, _ lub -');
      return true;
    }
    publisher.rememberNick(arg);
    publisher.start(wpis, arg);
    return true;
  });

  api.aliases.register(/^rkgnuke(?:\s+(.+))?$/i, (matches) => {
    const key = matches?.[1]?.trim();
    if (key === '-') {
      const count = baza.wyczysc();
      info(`lokalna lista wyczyszczona (${count}) — ranking bez zmian`);
      view?.refresh();
      return true;
    }
    info('kasowanie calego rankingu jest wylaczone — moderuj pojedyncze kluby na stronie');
    info('rkgnuke - nadal czysci tylko lokalna liste');
    return true;
  });

  return {
    zaproponuj,
    zatrzymaj: () => {
      publisher.stop();
      wall.stop();
      view?.stop();
      view = null;
    },
  };
}
