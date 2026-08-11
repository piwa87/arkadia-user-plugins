import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupHof } from '../../../src/plugins/rkg-plugin/hof';
import { utworzBaze } from '../../../src/plugins/rkg-plugin/store';
import { createMockApi, MockAnsiAwareBuffer } from '../../helpers/mockApi';
import { storage } from '../../../src/lib/storage';
import type { WpisLokalny } from '../../../src/shared/rkg-api';

/**
 * Minimal element stand-in. The popup bodies are built with plain
 * `document.createElement` + `append`, so this is enough to drive them — and it
 * keeps the suite on the `node` environment (no jsdom) like the rest.
 */
class FakeEl {
  children: FakeEl[] = [];
  className = '';
  textContent = '';
  value = '';
  type = '';
  placeholder = '';
  maxLength = 0;
  disabled = false;
  onclick: (() => void) | null = null;
  constructor(public tag: string) {}
  append(...kids: FakeEl[]) {
    this.children.push(...kids);
  }
  /** Depth-first search over the built tree. */
  szukaj(pred: (e: FakeEl) => boolean): FakeEl | null {
    for (const k of this.children) {
      if (pred(k)) return k;
      const g = k.szukaj(pred);
      if (g) return g;
    }
    return null;
  }
  przycisk(etykieta: string): FakeEl {
    const b = this.szukaj((e) => e.tag === 'button' && e.textContent.includes(etykieta));
    expect(b, `brak przycisku: ${etykieta}`).not.toBeNull();
    return b!;
  }
  get tekst(): string {
    return [this.textContent, ...this.children.map((k) => k.tekst)].join(' ');
  }
}

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };
}

type Mock = ReturnType<typeof createMockApi>;

function setup() {
  const mock = createMockApi();
  const baza = utworzBaze();
  const hof = setupHof(mock.api, baza);
  return { mock, baza, hof, cleanup: hof.zatrzymaj };
}

function odpal(mock: Mock, wejscie: string): boolean {
  const alias = mock.aliases.find((a) => a.pattern.test(wejscie));
  expect(alias, `brak aliasu: ${wejscie}`).toBeDefined();
  return alias!.callback(wejscie.match(alias!.pattern) as RegExpMatchArray) as boolean;
}

function printed(mock: Mock): string[] {
  return (mock.api.output.print as any).mock.calls.map(([a]: [unknown]) =>
    a instanceof MockAnsiAwareBuffer ? a.text : String(a),
  );
}

/** Click the most recently printed option whose label contains `etykieta`. */
function klikOpcje(mock: Mock, etykieta: string): void {
  const buf = (mock.api.output.print as any).mock.calls
    .map(([a]: [unknown]) => a)
    .filter((a: unknown): a is MockAnsiAwareBuffer => a instanceof MockAnsiAwareBuffer)
    .reverse()
    .find((b: MockAnsiAwareBuffer) => b.text.includes(etykieta));
  expect(buf, `brak opcji: ${etykieta}`).toBeDefined();
  buf!.klik(etykieta);
}

/** Answer the outstanding nick prompt the way typing would. */
function wpisz(mock: Mock, tekst: string): string | null | undefined {
  const hook = mock.commandHooks[mock.commandHooks.length - 1];
  expect(hook, 'nie zapytano o nick').toBeDefined();
  return hook!.callback(tekst);
}

/** Pretend GMCP knows who we are. */
function ustawPostac(mock: Mock, imie: string) {
  (mock.api.gmcp.get as any).mockReturnValue({ char: { info: { name: imie } } });
}

const WPIS: WpisLokalny = {
  id: 'lok-1',
  typ: 'loza',
  przymiotnik: 'maluski',
  rzeczownik: 'korbacz',
  liczba: 'mnogiej',
  przypadek: 'dopelniaczu',
  wynik: 'Loza Maluskich Korbaczy',
  charakter: 'jawny',
  plec: 'dowolnej',
  role: { przywodca: 'Przywodca Lozy', zastepca: 'Zaufany Lozy', czlonek: 'Uczestnik Lozy' },
  kiedy: 1,
};

/** Mock fetch; returns the JSON each call resolves with. */
function stubFetch(
  dane: unknown,
  ok = true,
  status = ok ? 200 : 500,
  limit = { dostepny: true, ponownieZaMs: 0 },
) {
  const request = vi.fn(async (_url?: string, _init?: RequestInit) => ({
    ok,
    status,
    json: async () => dane,
  }));
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/api/limit')) {
      return { ok: true, status: 200, json: async () => limit };
    }
    return request(url, init);
  }));
  return request;
}

/** Render the popup body the way the client would, via its createContent. */
function zbudujOkno(mock: Mock): FakeEl {
  const opts = (mock.api.ui.registerPersistentPopup as any).mock.calls.at(-1)[0];
  return opts.createContent() as FakeEl;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
  vi.stubGlobal('document', { createElement: (t: string) => new FakeEl(t) });
  vi.stubGlobal('confirm', vi.fn(() => true));
  stubFetch({});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('setupHof registration', () => {
  it('adds a popup menu entry and does not throw', () => {
    const { mock, cleanup } = setup();
    expect(mock.api.ui.addPopupMenuEntry).toHaveBeenCalled();
    expect(() => cleanup()).not.toThrow();
  });

  it('rkghof opens the popup without needing a DOM', async () => {
    const { mock, cleanup } = setup();
    expect(odpal(mock, 'rkghof')).toBe(true);
    // registerPersistentPopup is async and fire-and-forget; let it settle.
    await Promise.resolve();
    expect(mock.api.ui.registerPersistentPopup).toHaveBeenCalled();
    cleanup();
  });

  it('renders the browse window with the captured clubs', async () => {
    const { mock, baza, cleanup } = setup();
    baza.dodajWpis(WPIS);

    odpal(mock, 'rkghof');
    await vi.waitFor(() => expect(mock.api.ui.registerPersistentPopup).toHaveBeenCalled());
    const okno = zbudujOkno(mock);

    // The padded, full-height container the popup body relies on.
    expect(okno.className).toContain('rkg-hof');
    expect(okno.tekst).toContain('Lokalne');
    expect(okno.tekst).toContain('Loza Maluskich Korbaczy');
    expect(okno.przycisk('Wyslij')).toBeTruthy();
    cleanup();
  });

  it('shows the authoritative daily-slot countdown in the local window', async () => {
    const { mock, cleanup } = setup();
    stubFetch({}, true, 200, { dostepny: false, ponownieZaMs: 2 * 3_600_000 });

    odpal(mock, 'rkghof');
    await vi.waitFor(() => {
      expect(mock.api.ui.registerPersistentPopup).toHaveBeenCalled();
      expect(zbudujOkno(mock).tekst).toContain('SLOT ZAJETY — kolejny za 2 godz.');
    });
    cleanup();
  });
});

describe('rkgstatus', () => {
  it('reports a ready daily slot', async () => {
    const { mock } = setup();

    expect(odpal(mock, 'rkgstatus')).toBe(true);

    await vi.waitFor(() => {
      expect(printed(mock).join('\n')).toContain('dzienny slot jest gotowy');
    });
  });

  it('reports the server countdown', async () => {
    const { mock } = setup();
    stubFetch({}, true, 200, { dostepny: false, ponownieZaMs: 90 * 60_000 });

    odpal(mock, 'rkgstatus');

    await vi.waitFor(() => {
      expect(printed(mock).join('\n')).toContain('1 godz. 30 min');
    });
  });
});

describe('the local list', () => {
  async function okno(mock: Mock) {
    odpal(mock, 'rkghof');
    await vi.waitFor(() => expect(mock.api.ui.registerPersistentPopup).toHaveBeenCalled());
    return zbudujOkno(mock);
  }

  it('deletes a single unsent club', async () => {
    const { mock, baza } = setup();
    baza.dodajWpis(WPIS);

    (await okno(mock)).przycisk('✕').onclick!();

    expect(baza.wpisy).toHaveLength(0);
  });

  it('offers no delete button for a club already in the ranking', async () => {
    const { mock, baza } = setup();
    const w = baza.dodajWpis(WPIS);
    baza.oznaczWyslany(w.id, 'zdalne-1');

    const widok = await okno(mock);

    expect(widok.tekst).toContain('w rankingu');
    expect(widok.szukaj((e) => e.textContent === '✕')).toBeNull();
  });

  it('bulk-deletes the unsent ones and keeps the published', async () => {
    const { mock, baza } = setup();
    const wyslany = baza.dodajWpis(WPIS);
    baza.oznaczWyslany(wyslany.id, 'zdalne-1');
    baza.dodajWpis({ ...WPIS, wynik: 'Liga Wrednych Kotow' });

    (await okno(mock)).przycisk('Usun niewyslane').onclick!();

    expect(baza.wpisy).toHaveLength(1);
    expect(baza.wpisy[0].wyslane).toBe('zdalne-1');
  });

  it('hides the bulk-delete button when everything is published', async () => {
    const { mock, baza } = setup();
    const w = baza.dodajWpis(WPIS);
    baza.oznaczWyslany(w.id, 'zdalne-1');

    expect((await okno(mock)).tekst).not.toContain('Usun niewyslane');
  });
});

describe('rkgnick', () => {
  it('reports anonymous when unset', () => {
    const { mock } = setup();
    odpal(mock, 'rkgnick');
    expect(printed(mock).join('\n')).toContain('anonim');
  });

  it('sets a valid nick and persists it', () => {
    const { mock } = setup();
    odpal(mock, 'rkgnick Piot');
    expect(storage.get('rkg:nick')).toBe('Piot');
    expect(printed(mock).join('\n')).toContain('Piot');
  });

  it('rejects an invalid nick', () => {
    const { mock } = setup();
    odpal(mock, 'rkgnick !!');
    expect(storage.get('rkg:nick')).toBeNull();
  });

  it('clears the nick and switches to anonymous with "-"', () => {
    const { mock } = setup();
    storage.set('rkg:nick', 'Piot');
    odpal(mock, 'rkgnick -');
    expect(storage.get('rkg:nick')).toBeNull();
    // Settled, so the first-upload prompt does not come back asking again.
    expect(storage.get('rkg:anonim')).toBe(true);
  });
});

describe('zaproponuj — the end-of-run options', () => {
  it('prints the three options and the ranking link', () => {
    const { mock, hof } = setup();
    storage.set('rkg:nick', 'Piot');

    hof.zaproponuj(WPIS);

    const out = printed(mock).join('\n');
    expect(out).toContain('jeden klub na 24 godziny');
    expect(out).toContain('Opcje:');
    expect(out).toContain('wyslij do rankingu (jako Piot)');
    expect(out).toContain('nie wysylaj');
    expect(out).toContain('otworz okno lokalnych');
    expect(out).toContain('Link do rankingu: https://');
    // Nothing is disclosed or asked before you actually choose to publish.
    expect(out).not.toContain('Nic wiecej');
    expect(mock.commandHooks).toHaveLength(0);
  });

  it('labels the send option with the GMCP character name when no nick is saved', () => {
    const { mock, hof } = setup();
    ustawPostac(mock, 'piotrek');

    hof.zaproponuj(WPIS);

    expect(printed(mock).join('\n')).toContain('wyslij do rankingu (jako Piotrek)');
  });

  it('asks for final confirmation, then sends once a nick is settled', async () => {
    const { mock, baza, hof } = setup();
    const f = stubFetch({ id: 'zdalne-1', wynik: WPIS.wynik, zgloszenia: 1, duplikat: false });
    storage.set('rkg:nick', 'Piot');
    baza.dodajWpis(WPIS);

    hof.zaproponuj(baza.wpisy[0]);
    klikOpcje(mock, 'wyslij do rankingu');
    await vi.waitFor(() => expect(f).toHaveBeenCalled());

    expect(globalThis.confirm).toHaveBeenCalledWith(expect.stringContaining('uruchomi nowy okres 24 godzin'));
    expect(mock.commandHooks, 'nie powinno pytac o nick').toHaveLength(0);
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).nick).toBe('Piot');
    await vi.waitFor(() => expect(baza.wpisy[0].wyslane).toBe('zdalne-1'));
  });

  it('"nie wysylaj" sends nothing', () => {
    const { mock, hof } = setup();
    const f = stubFetch({});

    hof.zaproponuj(WPIS);
    klikOpcje(mock, 'nie wysylaj');

    expect(f).not.toHaveBeenCalled();
  });

  it('keeps the daily slot when final confirmation is cancelled', async () => {
    const { mock, baza, hof } = setup();
    const f = stubFetch({});
    vi.stubGlobal('confirm', vi.fn(() => false));
    storage.set('rkg:nick', 'Piot');
    // The corrected, versioned disclosure must not be suppressed by the old flag.
    storage.set('rkg:zgoda', true);
    baza.dodajWpis(WPIS);

    hof.zaproponuj(baza.wpisy[0]);
    klikOpcje(mock, 'wyslij do rankingu');

    await vi.waitFor(() => expect(globalThis.confirm).toHaveBeenCalled());
    expect(globalThis.confirm).toHaveBeenCalledWith(expect.stringContaining(WPIS.wynik));
    expect(f).not.toHaveBeenCalled();
    expect(baza.wpisy[0].wyslane).toBeUndefined();
    expect(printed(mock).join('\n')).toContain('slot pozostaje dostepny');
    expect(printed(mock).join('\n')).toContain('losowy identyfikator tej instalacji');
  });

  it('"otworz okno lokalnych" opens the window on the local tab', async () => {
    const { mock, hof } = setup();

    hof.zaproponuj(WPIS);
    klikOpcje(mock, 'otworz okno lokalnych');
    await vi.waitFor(() => expect(mock.api.ui.registerPersistentPopup).toHaveBeenCalled());

    expect(zbudujOkno(mock).tekst).toContain('Lokalne');
  });

  it('a second click cannot publish the same club twice', async () => {
    const { mock, baza, hof } = setup();
    const f = stubFetch({ id: 'zdalne-3', wynik: WPIS.wynik, zgloszenia: 1, duplikat: false });
    storage.set('rkg:anonim', true);
    baza.dodajWpis(WPIS);

    hof.zaproponuj(baza.wpisy[0]);
    klikOpcje(mock, 'wyslij do rankingu');
    klikOpcje(mock, 'wyslij do rankingu'); // in flight — must not fire a second POST
    await vi.waitFor(() => expect(baza.wpisy[0].wyslane).toBe('zdalne-3'));
    klikOpcje(mock, 'wyslij do rankingu'); // already sent

    expect(f).toHaveBeenCalledTimes(1);
    expect(printed(mock).join('\n')).toContain('juz wyslane');
  });
});

describe('the first upload settles the nick', () => {
  it('discloses, asks, and takes the character name on a bare Enter', async () => {
    const { mock, baza, hof } = setup();
    const f = stubFetch({ id: 'zdalne-4', wynik: WPIS.wynik, zgloszenia: 1, duplikat: false });
    ustawPostac(mock, 'piotrek');
    baza.dodajWpis(WPIS);

    hof.zaproponuj(baza.wpisy[0]);
    klikOpcje(mock, 'wyslij do rankingu');

    const out = printed(mock).join('\n');
    expect(out).toContain('skladniki nazwy');
    expect(out).toContain('losowy identyfikator tej instalacji');
    expect(out).toContain('nie jest kontem');
    expect(out).not.toContain('Nic wiecej');
    expect(out).toContain("Enter = Piotrek");
    expect(wpisz(mock, ''), 'bare Enter must be swallowed').toBeNull();

    await vi.waitFor(() => expect(f).toHaveBeenCalled());
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).nick).toBe('Piotrek');
    expect(storage.get('rkg:nick')).toBe('Piotrek');
    // One-shot: the hook let go of the input again.
    expect(mock.commandHooks).toHaveLength(0);
  });

  it('takes a typed nick, and never asks again', async () => {
    const { mock, baza, hof } = setup();
    const f = stubFetch({ id: 'zdalne-5', wynik: WPIS.wynik, zgloszenia: 1, duplikat: false });
    baza.dodajWpis(WPIS);

    hof.zaproponuj(baza.wpisy[0]);
    klikOpcje(mock, 'wyslij do rankingu');
    expect(wpisz(mock, 'Zenek')).toBeNull();
    await vi.waitFor(() => expect(f).toHaveBeenCalled());
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).nick).toBe('Zenek');

    const drugi = baza.dodajWpis({ ...WPIS, wynik: 'Liga Wrednych Kotow' });
    hof.zaproponuj(drugi);
    klikOpcje(mock, 'wyslij do rankingu');
    await vi.waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    expect(mock.commandHooks).toHaveLength(0);
  });

  it('"-" publishes anonymously and settles that too', async () => {
    const { mock, baza, hof } = setup();
    const f = stubFetch({ id: 'zdalne-6', wynik: WPIS.wynik, zgloszenia: 1, duplikat: false });
    ustawPostac(mock, 'piotrek');
    baza.dodajWpis(WPIS);

    hof.zaproponuj(baza.wpisy[0]);
    klikOpcje(mock, 'wyslij do rankingu');
    expect(wpisz(mock, '-')).toBeNull();

    await vi.waitFor(() => expect(f).toHaveBeenCalled());
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).nick).toBeUndefined();
    expect(storage.get('rkg:anonim')).toBe(true);
    expect(storage.get('rkg:nick')).toBeNull();
  });

  it('hands a non-nick back to the game and drops the upload', () => {
    const { mock, baza, hof } = setup();
    const f = stubFetch({});
    baza.dodajWpis(WPIS);

    hof.zaproponuj(baza.wpisy[0]);
    klikOpcje(mock, 'wyslij do rankingu');
    // undefined = "keep the original command", i.e. the game still gets it.
    expect(wpisz(mock, 'polnoc na wschod')).toBeUndefined();

    expect(f).not.toHaveBeenCalled();
    expect(storage.get('rkg:nick')).toBeNull();
    expect(mock.commandHooks).toHaveLength(0);
    expect(printed(mock).join('\n')).toContain('nie wyglada na nick');
  });

  it('gives the input back if the prompt goes unanswered', async () => {
    vi.useFakeTimers();
    try {
      const { mock, baza, hof } = setup();
      const f = stubFetch({});
      baza.dodajWpis(WPIS);

      hof.zaproponuj(baza.wpisy[0]);
      klikOpcje(mock, 'wyslij do rankingu');
      expect(mock.commandHooks).toHaveLength(1);

      vi.advanceTimersByTime(61_000);

      expect(mock.commandHooks).toHaveLength(0);
      expect(f).not.toHaveBeenCalled();
      expect(printed(mock).join('\n')).toContain('minal czas');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('rkgwyslij', () => {
  it('does not ask for confirmation or upload when the server says the slot is occupied', async () => {
    const { mock, baza } = setup();
    const f = stubFetch({}, true, 200, { dostepny: false, ponownieZaMs: 8 * 3_600_000 });
    storage.set('rkg:anonim', true);
    baza.dodajWpis(WPIS);

    odpal(mock, 'rkgwyslij');

    await vi.waitFor(() => {
      expect(printed(mock).join('\n')).toContain('dzienny slot bedzie dostepny za 8 godz.');
    });
    expect(globalThis.confirm).not.toHaveBeenCalled();
    expect(f).not.toHaveBeenCalled();
    expect(baza.wpisy[0].wyslane).toBeUndefined();
  });

  it('sends the newest unsent club with the saved nick', async () => {
    const { mock, baza } = setup();
    const f = stubFetch({ id: 'zdalne-4', wynik: WPIS.wynik, zgloszenia: 1, duplikat: false });
    storage.set('rkg:nick', 'Piot');
    baza.dodajWpis(WPIS);

    odpal(mock, 'rkgwyslij');
    await vi.waitFor(() => expect(f).toHaveBeenCalled());

    expect(globalThis.confirm).toHaveBeenCalledWith(expect.stringContaining('uruchomi nowy okres 24 godzin'));
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).nick).toBe('Piot');
  });

  it('takes a nick argument, and "-" for anonymous', async () => {
    const { mock, baza } = setup();
    const f = stubFetch({ id: 'zdalne-5', wynik: WPIS.wynik, zgloszenia: 1, duplikat: false });
    baza.dodajWpis(WPIS);

    odpal(mock, 'rkgwyslij Zenek');
    await vi.waitFor(() => expect(f).toHaveBeenCalled());
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).nick).toBe('Zenek');
    expect(storage.get('rkg:nick')).toBe('Zenek');

    baza.dodajWpis({ ...WPIS, wynik: 'Liga Wrednych Kotow' });
    odpal(mock, 'rkgwyslij -');
    await vi.waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    expect(JSON.parse((f.mock.calls[1] as any)[1].body).nick).toBeUndefined();
  });

  it('rejects an invalid nick and reports an empty list', () => {
    const { mock, baza } = setup();
    const f = stubFetch({});

    odpal(mock, 'rkgwyslij');
    expect(printed(mock).join('\n')).toContain('nie ma czego wyslac');

    baza.dodajWpis(WPIS);
    odpal(mock, 'rkgwyslij !!');
    expect(f).not.toHaveBeenCalled();
    expect(printed(mock).join('\n')).toContain('2-16 znakow');
  });

  it('shows the daily-quota response and keeps the club unsent', async () => {
    const { mock, baza } = setup();
    stubFetch(
      { blad: 'limit: jeden klub na 24 godziny; kolejny mozesz wyslac za 8 godz.' },
      false,
      429,
    );
    storage.set('rkg:anonim', true);
    baza.dodajWpis(WPIS);

    odpal(mock, 'rkgwyslij');

    await vi.waitFor(() => expect(printed(mock).join('\n')).toContain('kolejny mozesz wyslac'));
    expect(baza.wpisy[0].wyslane).toBeUndefined();
  });
});

describe('rkgnuke', () => {
  it('does nothing without a key', () => {
    const { mock } = setup();
    const f = stubFetch({});
    odpal(mock, 'rkgnuke');
    expect(f).not.toHaveBeenCalled();
    expect(printed(mock).join('\n')).toContain('uzycie');
  });

  it('"-" flushes only the local list, leaving the wall alone', () => {
    const { mock, baza } = setup();
    const f = stubFetch({});
    baza.dodajWpis(WPIS);

    odpal(mock, 'rkgnuke -');

    expect(baza.wpisy).toHaveLength(0);
    expect(f).not.toHaveBeenCalled();
    expect(printed(mock).join('\n')).toContain('ranking bez zmian');
  });

  it('sends DELETE with the admin header and clears the local list', async () => {
    const { mock, baza } = setup();
    const f = stubFetch({ nazwy: 3, glosy: 5, zdarzenia: 9 });
    baza.dodajWpis(WPIS);

    odpal(mock, 'rkgnuke tajne-haslo');
    await vi.waitFor(() => expect(baza.wpisy).toHaveLength(0));

    const [url, init] = f.mock.calls[0] as any;
    expect(url).toContain('/api/nazwy');
    expect(init.method).toBe('DELETE');
    expect(init.headers['X-RKG-Admin']).toBe('tajne-haslo');
    expect(printed(mock).join('\n')).toContain('3 nazw');
  });

  it('keeps the local list when the server refuses', async () => {
    const { mock, baza } = setup();
    stubFetch({ blad: 'brak dostepu' }, false);
    baza.dodajWpis(WPIS);

    odpal(mock, 'rkgnuke zle-haslo');
    await vi.waitFor(() => expect(printed(mock).join('\n')).toContain('nie wyczyszczono'));
    expect(baza.wpisy).toHaveLength(1);
  });
});
