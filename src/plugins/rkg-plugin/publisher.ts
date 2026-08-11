import type { PluginApi } from '@arkadia/plugin-types';
import type { WpisLokalny, ZgloszenieRequest, ZgloszenieResponse } from '../../shared/rkg-api';
import { WZORZEC_NICKA } from '../../shared/rkg-grammar';
import { getCharName } from '../../lib/getCharName';
import { storage } from '../../lib/storage';
import type { Baza } from './store';
import type { RkgStyles } from './styles';
import type { WallClient } from './wall-client';

const KL_NICK = 'rkg:nick';
const KL_ANONIM = 'rkg:anonim';
// Versioned so people who saw the old, incomplete disclosure see the correction.
const KL_UJAWNIENIE = 'rkg:ujawnienie:v2';
const PYTANIE_MS = 60_000;

export interface Publisher {
  start(wpis: WpisLokalny, nick?: string | null): void;
  defaultNick(): string | null;
  savedNick(): string | null;
  rememberNick(nick: string): void;
  rememberAnonymous(): void;
  stop(): void;
}

interface PublisherOptions {
  api: PluginApi;
  baza: Baza;
  styles: RkgStyles;
  wall: WallClient;
  info(text: string): void;
  onChanged(): void;
}

/** Owns informed consent, signature selection, confirmation and upload state. */
export function createPublisher(options: PublisherOptions): Publisher {
  const { api, baza, styles, wall, info, onChanged } = options;
  const inFlight = new Set<string>();
  let questionHook: string | null = null;
  let questionTimer: ReturnType<typeof setTimeout> | null = null;

  function ownCharacterName(): string | null {
    const name = getCharName(api);
    if (!name) return null;
    const candidate = name.charAt(0).toUpperCase() + name.slice(1);
    return WZORZEC_NICKA.test(candidate) ? candidate : null;
  }

  function savedNick(): string | null {
    return storage.get<string>(KL_NICK);
  }

  function defaultNick(): string | null {
    return savedNick() ?? ownCharacterName();
  }

  function rememberNick(nick: string): void {
    storage.set(KL_NICK, nick);
    storage.remove(KL_ANONIM);
  }

  function rememberAnonymous(): void {
    storage.remove(KL_NICK);
    storage.set(KL_ANONIM, true);
  }

  /** Printed once per disclosure version, before anything can leave the client. */
  function disclose(): void {
    if (storage.get<boolean>(KL_UJAWNIENIE)) return;
    storage.set(KL_UJAWNIENIE, true);
    const text =
      '[rkg] Do rankingu ida: nazwa klubu, skladniki nazwy, tytuly wladz, wybrany nick ' +
      'oraz losowy identyfikator tej instalacji. Identyfikator sluzy do limitu i glosow; nie jest kontem.';
    const buf = new api.AnsiAwareBuffer(text);
    buf.color([0, text.length], styles.info);
    api.output.print(buf);
  }

  function confirmUpload(wpis: WpisLokalny, nick: string | null): void {
    if (wpis.wyslane) {
      info(`juz wyslane: ${wpis.wynik}`);
      return;
    }
    if (inFlight.has(wpis.id)) return;

    const accepted =
      typeof globalThis.confirm === 'function' &&
      globalThis.confirm(
        `Wyslac "${wpis.wynik}" do rankingu?\n\n` +
          'To wykorzysta jedyny slot na 24 godziny.',
      );
    if (!accepted) {
      info('nie wyslano — dzienny slot pozostaje dostepny');
      return;
    }
    void send(wpis, nick);
  }

  async function send(wpis: WpisLokalny, nick: string | null): Promise<void> {
    if (inFlight.has(wpis.id)) return;
    inFlight.add(wpis.id);
    const payload: ZgloszenieRequest = {
      typ: wpis.typ,
      przymiotnik: wpis.przymiotnik,
      rzeczownik: wpis.rzeczownik,
      liczba: wpis.liczba,
      przypadek: wpis.przypadek,
      wynik: wpis.wynik,
      role: wpis.role,
      nick: nick || undefined,
      glosujacy: wall.voterId(),
    };
    try {
      const response = await wall.request<ZgloszenieResponse>('/api/nazwy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        baza.oznaczWyslany(wpis.id, response.dane.id);
        const as = nick ? ` jako ${nick}` : ' anonimowo';
        info(response.dane.duplikat ? `juz bylo: ${wpis.wynik}` : `wyslano${as}: ${wpis.wynik}`);
      } else {
        info(`nie wyslano (${response.blad})`);
      }
    } finally {
      inFlight.delete(wpis.id);
      onChanged();
    }
  }

  function start(wpis: WpisLokalny, nick?: string | null): void {
    if (wpis.wyslane) {
      info(`juz wyslane: ${wpis.wynik}`);
      return;
    }
    if (inFlight.has(wpis.id)) return;
    disclose();

    // An explicit nick (including null = anonymous) has already resolved the
    // signature choice, but it still goes through the final confirmation.
    if (nick !== undefined) {
      confirmUpload(wpis, nick);
      return;
    }

    const stored = savedNick();
    if (stored) {
      confirmUpload(wpis, stored);
      return;
    }
    if (storage.get<boolean>(KL_ANONIM)) {
      confirmUpload(wpis, null);
      return;
    }

    const character = ownCharacterName();
    info(
      character
        ? `Podaj nick pod ktorym publikowac (Enter = ${character}, '-' = anonimowo):`
        : "Podaj nick pod ktorym publikowac ('-' = anonimowo):",
    );
    askForNick(character, (resolved, anonymous) => {
      if (resolved) rememberNick(resolved);
      if (anonymous) rememberAnonymous();
      confirmUpload(wpis, resolved);
    });
  }

  function askForNick(
    character: string | null,
    done: (nick: string | null, anonymous: boolean) => void,
  ): void {
    cancelQuestion();
    questionHook = api.commandHooks.register((cmd: string) => {
      const text = (cmd ?? '').trim();
      if (text === '') {
        cancelQuestion();
        if (character) done(character, false);
        else info('nie wyslano — brak nicka i brak imienia z GMCP');
        return null;
      }
      if (text === '-') {
        cancelQuestion();
        done(null, true);
        return null;
      }
      if (WZORZEC_NICKA.test(text)) {
        cancelQuestion();
        done(text, false);
        return null;
      }
      cancelQuestion();
      info('to nie wyglada na nick — nie wyslano. Sprobuj: rkgwyslij <nick>');
      return undefined;
    }, 100);
    questionTimer = setTimeout(() => {
      cancelQuestion();
      info('minal czas na nick — nie wyslano. Sprobuj: rkgwyslij <nick>');
    }, PYTANIE_MS);
  }

  function cancelQuestion(): void {
    if (questionHook) {
      api.commandHooks.unregister(questionHook);
      questionHook = null;
    }
    if (questionTimer !== null) {
      clearTimeout(questionTimer);
      questionTimer = null;
    }
  }

  return {
    start,
    defaultNick,
    savedNick,
    rememberNick,
    rememberAnonymous,
    stop: cancelQuestion,
  };
}
