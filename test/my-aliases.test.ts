import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { init } from '../src/plugins/my-aliases-plugin';
import { createMockApi, createMockLine, MockAnsiAwareBuffer } from './helpers/mockApi';

describe('my-aliases plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the arrival trigger and colors matched travel text', async () => {
    const { api, triggers } = createMockApi();
    await init(api);

    expect(triggers).toHaveLength(1);
    expect(triggers[0].tag).toBe('starterPlugin');

    const line = createMockLine('Statek z wolna doplywa do brzegu.');
    const result = triggers[0].callback(line, ['Statek z wolna doplywa do brzegu.'] as unknown as RegExpMatchArray);

    expect(line.color).toHaveBeenCalledWith([0, 33], { type: 'hex', value: '#d97706' });
    expect(result).toEqual({ text: 'Statek z wolna doplywa do brzegu.', appliedRange: [0, 33] });
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

    expect(api.command.send).toHaveBeenNthCalledWith(1, 'wyj lampe');
    expect(api.command.send).toHaveBeenNthCalledWith(2, 'przytrocz lampe');
    expect(api.command.send).toHaveBeenNthCalledWith(3, 'wyj olej');
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
    expect(api.command.send).toHaveBeenNthCalledWith(3, 'wlz lampe');
    expect(api.command.send).toHaveBeenNthCalledWith(4, 'wlz oleje');
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

  it('registers alias! that prints a boxed help with all aliases', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const helpAlias = aliases.find((alias) => alias.pattern.test('alias!'));
    expect(helpAlias).toBeDefined();

    const result = helpAlias!.callback();

    const printed = (api.output.print as ReturnType<typeof vi.fn>).mock.calls.map(([arg]) =>
      arg instanceof MockAnsiAwareBuffer ? arg.text : arg,
    );

    expect(printed.some((t) => t.startsWith('\u250c'))).toBe(true); // top border ┌
    expect(printed.some((t) => t.startsWith('\u2514'))).toBe(true); // bottom border └
    expect(printed.some((t) => t.includes('My Aliases'))).toBe(true);
    expect(printed.some((t) => t.includes('alias!'))).toBe(true);
    expect(printed.some((t) => t.includes('la+'))).toBe(true);
    expect(printed.some((t) => t.includes('la-'))).toBe(true);
    expect(printed.some((t) => t.includes('pj <text>'))).toBe(true);
    expect(printed.some((t) => t.includes('pr <text>'))).toBe(true);
    expect(printed.some((t) => t.includes('test-arrival'))).toBe(true);
    expect(result).toBe(true);
  });
});
