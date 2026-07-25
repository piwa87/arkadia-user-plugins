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

/** The last buffer printed — the clickable offer line. */
function ostatniBufor(mock: Mock): MockAnsiAwareBuffer {
  const bufory = (mock.api.output.print as any).mock.calls
    .map(([a]: [unknown]) => a)
    .filter((a: unknown) => a instanceof MockAnsiAwareBuffer);
  expect(bufory.length, 'nic nie wydrukowano jako bufor').toBeGreaterThan(0);
  return bufory.at(-1) as MockAnsiAwareBuffer;
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
function stubFetch(dane: unknown, ok = true) {
  const f = vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => dane }));
  vi.stubGlobal('fetch', f);
  return f;
}

/** Render the popup body the way the client would, via its createContent. */
function zbudujOkno(mock: Mock): FakeEl {
  const opts = (mock.api.ui.registerPersistentPopup as any).mock.calls.at(-1)[0];
  return opts.createContent() as FakeEl;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
  vi.stubGlobal('document', { createElement: (t: string) => new FakeEl(t) });
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

    // The padded container the popup body relies on, plus the club and its
    // send button.
    expect(okno.className).toContain('rkg-hof');
    expect(okno.tekst).toContain('Loza Maluskich Korbaczy');
    expect(okno.przycisk('Wyslij')).toBeTruthy();
    cleanup();
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

  it('clears the nick and revokes consent with "-"', () => {
    const { mock } = setup();
    storage.set('rkg:nick', 'Piot');
    storage.set('rkg:zgoda', true);
    odpal(mock, 'rkgnick -');
    expect(storage.get('rkg:nick')).toBeNull();
    expect(storage.get('rkg:zgoda')).toBe(false);
  });
});

describe('zaproponuj — the end-of-run publish offer', () => {
  it('offers the saved nick, anonymous and no, and discloses what is sent', () => {
    const { mock, hof } = setup();
    storage.set('rkg:nick', 'Piot');

    hof.zaproponuj(WPIS);

    expect(printed(mock).join('\n')).toContain('nazwa klubu, tytuly wladz i nick');
    expect(ostatniBufor(mock).text).toContain('[wyslij jako Piot]');
    expect(ostatniBufor(mock).text).toContain('[anonimowo]');
    expect(ostatniBufor(mock).text).toContain('[nie]');
  });

  it('falls back to the GMCP character name when no nick is saved', () => {
    const { mock, hof } = setup();
    ustawPostac(mock, 'piotrek');

    hof.zaproponuj(WPIS);

    expect(ostatniBufor(mock).text).toContain('[wyslij jako Piotrek]');
  });

  it('offers only anonymous when neither a nick nor a character name is known', () => {
    const { mock, hof } = setup();

    hof.zaproponuj(WPIS);

    const linia = ostatniBufor(mock).text;
    expect(linia).toContain('[wyslij anonimowo]');
    expect(linia).not.toContain('[wyslij jako');
    expect(linia).toContain('rkgnick');
  });

  it('sends signed on click, saving the nick and recording consent', async () => {
    const { mock, baza, hof } = setup();
    const f = stubFetch({ id: 'zdalne-1', wynik: WPIS.wynik, zgloszenia: 1, duplikat: false });
    ustawPostac(mock, 'piotrek');
    baza.dodajWpis(WPIS);

    hof.zaproponuj(baza.wpisy[0]);
    ostatniBufor(mock).klik('[wyslij jako Piotrek]');
    await vi.waitFor(() => expect(f).toHaveBeenCalled());

    const payload = JSON.parse((f.mock.calls[0] as any)[1].body);
    expect(payload.nick).toBe('Piotrek');
    expect(payload.wynik).toBe('Loza Maluskich Korbaczy');
    expect(storage.get('rkg:nick')).toBe('Piotrek');
    expect(storage.get('rkg:zgoda')).toBe(true);
    await vi.waitFor(() => expect(baza.wpisy[0].wyslane).toBe('zdalne-1'));
  });

  it('"anonimowo" sends without a nick and keeps the saved one', async () => {
    const { mock, baza, hof } = setup();
    const f = stubFetch({ id: 'zdalne-2', wynik: WPIS.wynik, zgloszenia: 1, duplikat: false });
    storage.set('rkg:nick', 'Piot');
    baza.dodajWpis(WPIS);

    hof.zaproponuj(baza.wpisy[0]);
    ostatniBufor(mock).klik('[anonimowo]');
    await vi.waitFor(() => expect(f).toHaveBeenCalled());

    expect(JSON.parse((f.mock.calls[0] as any)[1].body).nick).toBeUndefined();
    // A per-send choice, not a preference change.
    expect(storage.get('rkg:nick')).toBe('Piot');
  });

  it('"nie" sends nothing', () => {
    const { mock, hof } = setup();
    const f = stubFetch({});

    hof.zaproponuj(WPIS);
    ostatniBufor(mock).klik('[nie]');

    expect(f).not.toHaveBeenCalled();
  });

  it('a second click cannot publish the same club twice', async () => {
    const { mock, baza, hof } = setup();
    const f = stubFetch({ id: 'zdalne-3', wynik: WPIS.wynik, zgloszenia: 1, duplikat: false });
    baza.dodajWpis(WPIS);

    hof.zaproponuj(baza.wpisy[0]);
    const linia = ostatniBufor(mock);
    linia.klik('[wyslij anonimowo]');
    linia.klik('[wyslij anonimowo]'); // in flight — must not fire a second POST
    await vi.waitFor(() => expect(baza.wpisy[0].wyslane).toBe('zdalne-3'));
    linia.klik('[wyslij anonimowo]'); // already sent

    expect(f).toHaveBeenCalledTimes(1);
    expect(printed(mock).join('\n')).toContain('juz wyslane');
  });

  it('the disclosure is printed only until consent is recorded', () => {
    const { mock, hof } = setup();
    storage.set('rkg:zgoda', true);

    hof.zaproponuj(WPIS);

    expect(printed(mock).join('\n')).not.toContain('Nic wiecej');
  });
});

describe('rkgwyslij', () => {
  it('sends the newest unsent club with the saved nick', async () => {
    const { mock, baza } = setup();
    const f = stubFetch({ id: 'zdalne-4', wynik: WPIS.wynik, zgloszenia: 1, duplikat: false });
    storage.set('rkg:nick', 'Piot');
    baza.dodajWpis(WPIS);

    odpal(mock, 'rkgwyslij');
    await vi.waitFor(() => expect(f).toHaveBeenCalled());

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
    expect(printed(mock).join('\n')).toContain('sciana bez zmian');
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
