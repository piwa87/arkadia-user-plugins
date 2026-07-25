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
  it('registers no triggers at all — everything is armed on demand', async () => {
    const mock = createMockApi();
    await init(mock.api);
    expect(mock.triggers).toHaveLength(0);
    expect(mock.oneTimeTriggers).toHaveLength(0);
    expect(mock.tokenTriggers).toHaveLength(0);
    await destroy();
  });

  it('leaves game output untouched', async () => {
    const mock = createMockApi();
    await init(mock.api);

    const line = runLine(mock, 'Na ziemi lezy zardzewialy korbacz.');
    expect(line!.colorWords).not.toHaveBeenCalled();
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

describe('rkg-plugin destroy', () => {
  it('leaves no trigger of any kind behind', async () => {
    const mock = createMockApi();
    await init(mock.api);

    // Start a run so destroy() has live dialogue triggers to clean up.
    odpal(mock, 'rkg!');
    expect(mock.oneTimeTriggers.length).toBeGreaterThan(0);

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
