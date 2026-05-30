import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { init } from '../src/plugins/core-plugin/index';
import { createMockApi, createMockLine, MockAnsiAwareBuffer } from './helpers/mockApi';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

describe('core-plugin aliases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', makeLocalStorageMock());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the arrival trigger and colors matched travel text', async () => {
    const { api, triggers } = createMockApi();
    await init(api);

    const arrivalTrigger = triggers.find((tr) => tr.tag === 'corePlugin' && (tr.pattern as RegExp).test('Statek z wolna doplywa do brzegu.'));
    expect(arrivalTrigger).toBeDefined();

    const line = createMockLine('Statek z wolna doplywa do brzegu.');
    const result = arrivalTrigger!.callback(line, ['Statek z wolna doplywa do brzegu.'] as unknown as RegExpMatchArray);

    expect(line.color).toHaveBeenCalledWith(expect.any(Array), expect.any(Object));
    expect(result).toBeTruthy();
  });

  it('registers a footer component showing all 4 default targets on init', async () => {
    const { api, footerComponents } = createMockApi();
    await init(api);

    expect(footerComponents).toHaveLength(1);
    expect(footerComponents[0].id).toBe('targets');
    expect(footerComponents[0].initialContent).toContain('CEL');
    expect(footerComponents[0].initialContent).toContain('INIT');
  });

  it('updates the footer when set alias changes all targets', async () => {
    const { api, aliases, footerComponents } = createMockApi();
    await init(api);

    const setAlias = aliases.find((a) => a.pattern.test('set goblin'));
    setAlias!.callback(['set goblin', 'goblin'] as unknown as RegExpMatchArray);

    const { setContent } = footerComponents[0].handle;
    expect(setContent).toHaveBeenCalledTimes(1);
    const content = (setContent as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(content).toContain('goblin');
  });

  it('updates the footer when set1–set4 aliases change individual targets', async () => {
    const { api, aliases, footerComponents } = createMockApi();
    await init(api);

    for (let n = 1; n <= 4; n++) {
      const setNAlias = aliases.find((a) => a.pattern.test(`set${n} dragon`));
      expect(setNAlias).toBeDefined();
      setNAlias!.callback([`set${n} dragon`, 'dragon'] as unknown as RegExpMatchArray);
    }

    const { setContent } = footerComponents[0].handle;
    expect(setContent).toHaveBeenCalledTimes(4);
    const lastContent = (setContent as ReturnType<typeof vi.fn>).mock.calls[3][0] as string;
    expect(lastContent).toContain('dragon');
  });

  it('registers aliases for the CMUD movement macros with random delay', async () => {
    const { api, aliases, oneTimeTriggers } = createMockApi();
    await init(api);

    const opAlias = aliases.find((alias) => alias.pattern.test('op+'));
    expect(opAlias).toBeDefined();

    const opResult = opAlias!.callback(['op+'] as unknown as RegExpMatchArray);
    expect(opResult).toBe(true);

    expect(oneTimeTriggers).toHaveLength(1);
    expect(api.output.print).toHaveBeenCalledWith('Temp trigger armed: waiting for arrival (op+)');
    expect(api.command.send).not.toHaveBeenCalled();

    oneTimeTriggers[0].callback(createMockLine('Statek z wolna doplywa do brzegu.'), [
      'Statek z wolna doplywa do brzegu.',
    ] as unknown as RegExpMatchArray);

    vi.runAllTimers();
    expect(api.command.send).toHaveBeenCalledWith('op');

    vi.clearAllMocks();
    oneTimeTriggers.length = 0;

    const opPlusAlias = aliases.find((alias) => alias.pattern.test('op++'));
    expect(opPlusAlias).toBeDefined();

    const opPlusResult = opPlusAlias!.callback(['op++'] as unknown as RegExpMatchArray);
    expect(opPlusResult).toBe(true);

    expect(oneTimeTriggers).toHaveLength(1);
    expect(api.output.print).toHaveBeenCalledWith('Temp trigger armed: waiting for arrival (op++)');
    expect(api.command.send).not.toHaveBeenCalled();

    oneTimeTriggers[0].callback(createMockLine('Statek z wolna doplywa do brzegu.'), [
      'Statek z wolna doplywa do brzegu.',
    ] as unknown as RegExpMatchArray);

    vi.runAllTimers();
    expect(api.command.send).toHaveBeenCalledWith('op');
    expect(api.command.send).toHaveBeenCalledWith('ned');
  });

  it('registers a test alias to simulate arrival messages', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const testArrivalAlias = aliases.find((alias) => alias.pattern.test('test-arrival'));
    expect(testArrivalAlias).toBeDefined();

    const result = testArrivalAlias!.callback();

    expect(api.command.send).toHaveBeenCalledWith('/fake --> Statek z wolna doplywa do brzegu.');
    expect(result).toBe(true);
  });

  it('registers la+ alias that sends lamp-on sequence', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const laAlias = aliases.find((alias) => alias.pattern.test('la+'));
    expect(laAlias).toBeDefined();

    const result = laAlias!.callback();

    expect(api.command.send).toHaveBeenNthCalledWith(1, 'wyj lampe|olej');
    expect(api.command.send).toHaveBeenNthCalledWith(2, 'przytrocz lampe');
    expect(api.command.send).toHaveBeenNthCalledWith(3, 'naplam');
    expect(api.command.send).toHaveBeenNthCalledWith(4, '/zap');
    expect(result).toBe(true);
  });

  it('registers la- alias that sends lamp-off sequence', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const laAlias = aliases.find((alias) => alias.pattern.test('la-'));
    expect(laAlias).toBeDefined();

    const result = laAlias!.callback();

    expect(api.command.send).toHaveBeenNthCalledWith(1, '/zg');
    expect(api.command.send).toHaveBeenNthCalledWith(2, 'odtrocz lampe');
    expect(api.command.send).toHaveBeenNthCalledWith(3, 'wlz lampe|oleje');
    expect(result).toBe(true);
  });

  it('registers pj alias and forwards all captured text to przejrzyj', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const pjAlias = aliases.find((alias) => alias.pattern.test('pj mapa skarbow tutaj'));
    expect(pjAlias).toBeDefined();

    const result = pjAlias!.callback(['pj mapa skarbow tutaj', 'mapa skarbow tutaj'] as unknown as RegExpMatchArray);

    expect(api.command.send).toHaveBeenCalledWith('przejrzyj mapa skarbow tutaj');
    expect(result).toBe(true);
  });

  it('registers pr alias and forwards all captured text to przeczytaj', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const prAlias = aliases.find((alias) => alias.pattern.test('pr list od marynarza'));
    expect(prAlias).toBeDefined();

    const result = prAlias!.callback(['pr list od marynarza', 'list od marynarza'] as unknown as RegExpMatchArray);

    expect(api.command.send).toHaveBeenCalledWith('przeczytaj list od marynarza');
    expect(result).toBe(true);
  });

  it('registers ?alias that prints a boxed help with all aliases', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const helpAlias = aliases.find((alias) => alias.pattern.test('?alias'));
    expect(helpAlias).toBeDefined();

    const result = helpAlias!.callback();

    const printed = (api.output.print as ReturnType<typeof vi.fn>).mock.calls.map(([arg]) =>
      arg instanceof MockAnsiAwareBuffer ? arg.text : arg,
    );

    expect(printed.some((t) => t.startsWith('┌'))).toBe(true); // top border ┌
    expect(printed.some((t) => t.startsWith('└'))).toBe(true); // bottom border └
    expect(printed.some((t) => t.includes('My Aliases'))).toBe(true);
    expect(printed.some((t) => t.includes('?alias'))).toBe(true);
    expect(printed.some((t) => t.includes('la+'))).toBe(true);
    expect(printed.some((t) => t.includes('la-'))).toBe(true);
    expect(printed.some((t) => t.includes('pj'))).toBe(true);
    expect(printed.some((t) => t.includes('pr'))).toBe(true);
    expect(printed.some((t) => t.includes('test-arrival'))).toBe(true);
    expect(result).toBe(true);
  });
});
