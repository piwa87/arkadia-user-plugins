import { beforeEach, describe, expect, it, vi } from 'vitest';
import { destroy, init } from '../../../src/plugins/rkg-plugin';
import { createMockApi, MockAnsiAwareBuffer, runLine } from '../../helpers/mockApi';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
});

type Mock = ReturnType<typeof createMockApi>;

function wydrukowane(mock: Mock): string[] {
  return (mock.api.output.print as any).mock.calls.map(([arg]: [unknown]) =>
    arg instanceof MockAnsiAwareBuffer ? arg.text : String(arg),
  );
}

function odpal(mock: Mock, wejscie: string): boolean {
  const alias = mock.aliases.find((a) => a.pattern.test(wejscie));
  expect(alias, `brak aliasu dla: ${wejscie}`).toBeDefined();
  return alias!.callback(wejscie.match(alias!.pattern) as RegExpMatchArray) as boolean;
}

describe('rkg-plugin init', () => {
  it('registers no always-on regex triggers', async () => {
    const mock = createMockApi();
    await init(mock.api);
    expect(mock.triggers).toHaveLength(0);
    expect(mock.oneTimeTriggers).toHaveLength(0);
    await destroy();
  });

  it('highlights tracked nouns via token triggers', async () => {
    const mock = createMockApi();
    await init(mock.api);
    expect(mock.tokenTriggers.map((t) => t.token)).toContain('korbacz');

    const line = runLine(mock, 'Na ziemi lezy zardzewialy korbacz.');
    expect(line!.colorWords).toHaveBeenCalled();
    await destroy();
  });
});

describe('rkg / rkghelp', () => {
  it('prints the alias help', async () => {
    const mock = createMockApi();
    await init(mock.api);
    (mock.api.output.print as any).mockClear();

    odpal(mock, 'rkg');
    const linie = wydrukowane(mock);
    expect(linie[0]).toContain('Rendom Klub');
    expect(linie.some((t) => t.includes('rkg!'))).toBe(true);
    expect(linie.some((t) => t.includes('rkgshow!'))).toBe(true);
    await destroy();
  });

  it('rkghelp is an alias for the same help', async () => {
    const mock = createMockApi();
    await init(mock.api);
    (mock.api.output.print as any).mockClear();

    odpal(mock, 'rkghelp');
    expect(wydrukowane(mock)[0]).toContain('Rendom Klub');
    await destroy();
  });
});

describe('rkgshow!', () => {
  it('reports an empty database on a fresh install', async () => {
    const mock = createMockApi();
    await init(mock.api);
    (mock.api.output.print as any).mockClear();

    odpal(mock, 'rkgshow!');

    expect(wydrukowane(mock).some((t) => t.includes('brak zebranych klubow'))).toBe(true);
    await destroy();
  });
});

describe('rkgnazwy', () => {
  it('adds a noun, persists it and starts highlighting it', async () => {
    const mock = createMockApi();
    await init(mock.api);

    odpal(mock, 'rkgnazwy+ mantikora');
    expect(mock.tokenTriggers.map((t) => t.token)).toContain('mantikora');

    (mock.api.output.print as any).mockClear();
    odpal(mock, 'rkgnazwy');
    expect(wydrukowane(mock)[0]).toContain('mantikora');
    await destroy();
  });

  it('refuses a duplicate without touching the list', async () => {
    const mock = createMockApi();
    await init(mock.api);
    odpal(mock, 'rkgnazwy+ mantikora');
    const przed = mock.tokenTriggers.length;

    (mock.api.output.print as any).mockClear();
    odpal(mock, 'rkgnazwy+ mantikora');

    expect(wydrukowane(mock)[0]).toContain('juz jest');
    expect(mock.tokenTriggers).toHaveLength(przed);
    await destroy();
  });
});

describe('rkg? recorder', () => {
  it('captures output only while recording', async () => {
    const mock = createMockApi();
    await init(mock.api);

    runLine(mock, 'linia przed nagraniem');
    odpal(mock, 'rkg?');
    runLine(mock, 'Jaki typ organizacji?');
    odpal(mock, 'rkg?-');
    runLine(mock, 'linia po nagraniu');

    (mock.api.output.print as any).mockClear();
    odpal(mock, 'rkg??');
    const zrzut = wydrukowane(mock).join('\n');

    expect(zrzut).toContain('Jaki typ organizacji?');
    expect(zrzut).not.toContain('linia przed nagraniem');
    expect(zrzut).not.toContain('linia po nagraniu');
    await destroy();
  });

  it('removes its catch-all trigger when stopped', async () => {
    const mock = createMockApi();
    await init(mock.api);

    odpal(mock, 'rkg?');
    expect(mock.triggers).toHaveLength(1);
    odpal(mock, 'rkg?-');
    expect(mock.triggers).toHaveLength(0);
    await destroy();
  });

  it('passes lines through unchanged', async () => {
    const mock = createMockApi();
    await init(mock.api);
    odpal(mock, 'rkg?');
    const line = runLine(mock, 'Jaki typ organizacji?');
    expect(line).not.toBeNull();
    expect(line!.text).toBe('Jaki typ organizacji?');
    await destroy();
  });
});

describe('rkg-plugin destroy', () => {
  it('leaves no trigger of any kind behind, even mid-recording', async () => {
    const mock = createMockApi();
    await init(mock.api);
    expect(mock.tokenTriggers.length).toBeGreaterThan(0);

    // Arm the recorder so destroy() has a live regular trigger to clean up too.
    odpal(mock, 'rkg?');
    expect(mock.triggers.length).toBeGreaterThan(0);

    await destroy();

    // If this fails after adding a module, add its tag to TRIGGER_TAGS in
    // src/plugins/rkg-plugin/index.ts.
    const wyciek = [
      ...new Set(
        [...mock.triggers, ...mock.oneTimeTriggers, ...mock.tokenTriggers].map((t) => t.tag),
      ),
    ];
    expect(wyciek).toEqual([]);

    const listenery = [...mock.eventListeners.entries()]
      .filter(([, l]) => l.length > 0)
      .map(([event]) => event);
    expect(listenery).toEqual([]);
  });
});
