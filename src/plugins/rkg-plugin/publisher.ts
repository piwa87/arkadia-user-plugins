import type { PluginApi } from '@arkadia/plugin-types';
import type {
  StatusLimitu,
  WpisLokalny,
  ZgloszenieRequest,
  ZgloszenieResponse,
} from '../../shared/rkg-api';
import { WZORZEC_NICKA } from '../../shared/rkg-grammar';
import { getCharName } from '../../lib/getCharName';
import { storage } from '../../lib/storage';
import type { Baza } from './store';
import type { WallClient } from './wall-client';

const KL_NICK = 'rkg:nick';
const KL_ANONIM = 'rkg:anonim';
const KL_PONOWNIE_OD = 'rkg:limit:ponownieOd';
const PYTANIE_MS = 60_000;
const DZIEN = 86_400_000;

export interface Publisher {
  start(wpis: WpisLokalny, nick?: string | null): void;
  defaultNick(): string | null;
  savedNick(): string | null;
  rememberNick(nick: string): void;
  rememberAnonymous(): void;
  limitStatus(): StatusLimitu | null;
  refreshLimit(): Promise<StatusLimitu | null>;
  stop(): void;
}

interface PublisherOptions {
  api: PluginApi;
  baza: Baza;
  wall: WallClient;
  info(text: string): void;
  onChanged(): void;
}

/** Owns signature selection, explicit confirmation and upload state. */
export function createPublisher(options: PublisherOptions): Publisher {
  const { api, baza, wall, info, onChanged } = options;
  const inFlight = new Set<string>();
  const preparing = new Set<string>();
  let knownLimit: StatusLimitu | null = null;
  let checkingLimit: Promise<StatusLimitu | null> | null = null;
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

  function rememberLimit(limit: StatusLimitu): void {
    knownLimit = limit;
    if (limit.dostepny) storage.remove(KL_PONOWNIE_OD);
    else storage.set(KL_PONOWNIE_OD, Date.now() + limit.ponownieZaMs);
    onChanged();
  }

  function limitStatus(): StatusLimitu | null {
    const retryAt = storage.get<number>(KL_PONOWNIE_OD);
    if (retryAt != null) {
      const remaining = retryAt - Date.now();
      if (remaining > 0) return { dostepny: false, ponownieZaMs: remaining };
      storage.remove(KL_PONOWNIE_OD);
      knownLimit = { dostepny: true, ponownieZaMs: 0 };
    }
    return knownLimit;
  }

  async function refreshLimit(): Promise<StatusLimitu | null> {
    if (checkingLimit) return checkingLimit;
    checkingLimit = (async () => {
      const response = await wall.request<StatusLimitu>('/api/limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glosujacy: wall.voterId() }),
      });
      if (!response.ok) return null;
      const limit = response.dane;
      if (typeof limit.dostepny !== 'boolean' || !Number.isFinite(limit.ponownieZaMs)) return null;
      rememberLimit(limit);
      return limit;
    })();
    try {
      return await checkingLimit;
    } finally {
      checkingLimit = null;
    }
  }

  async function confirmUpload(wpis: WpisLokalny, nick: string | null): Promise<void> {
    if (wpis.wyslane) {
      info(`juz wyslane: ${wpis.wynik}`);
      return;
    }
    if (inFlight.has(wpis.id) || preparing.has(wpis.id)) return;
    preparing.add(wpis.id);

    try {
      const limit = await refreshLimit();
      if (limit && !limit.dostepny) {
        info(`dzienny slot bedzie dostepny za ${formatWait(limit.ponownieZaMs)}`);
        return;
      }

      const accepted =
        typeof globalThis.confirm === 'function' &&
        globalThis.confirm(
          `Wyslac "${wpis.wynik}" do rankingu?\n\n` +
            'Slot jest gotowy. Wyslanie uruchomi nowy okres 24 godzin.',
        );
      if (!accepted) {
        info('nie wyslano — dzienny slot pozostaje dostepny');
        return;
      }
      await send(wpis, nick);
    } finally {
      preparing.delete(wpis.id);
    }
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
        rememberLimit(response.dane.limit ?? { dostepny: false, ponownieZaMs: DZIEN });
        baza.oznaczWyslany(wpis.id, response.dane.id);
        const as = nick ? ` jako ${nick}` : ' anonimowo';
        info(response.dane.duplikat ? `juz bylo: ${wpis.wynik}` : `wyslano${as}: ${wpis.wynik}`);
      } else {
        if (response.limit) rememberLimit(response.limit);
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

    // An explicit nick (including null = anonymous) has already resolved the
    // signature choice, but it still goes through the final confirmation.
    if (nick !== undefined) {
      void confirmUpload(wpis, nick);
      return;
    }

    const stored = savedNick();
    if (stored) {
      void confirmUpload(wpis, stored);
      return;
    }
    if (storage.get<boolean>(KL_ANONIM)) {
      void confirmUpload(wpis, null);
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
      void confirmUpload(wpis, resolved);
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
    limitStatus,
    refreshLimit,
    stop: cancelQuestion,
  };
}

export function formatWait(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} godz.`;
  return `${hours} godz. ${rest} min`;
}
