import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { init } from '../src/plugins/core-plugin/index';
import { createMockApi } from './helpers/mockApi';

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

describe('core-plugin aliases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', makeLocalStorageMock());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a footer component showing all 4 default targets on init', async () => {
    const { api, footerComponents } = createMockApi();
    await init(api);

    const targets = footerComponents.find((c) => c.id === 'targets');
    expect(targets).toBeDefined();
    expect(targets!.initialContent).toContain('CEL');
    expect(targets!.initialContent).toContain('INIT');
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
});

// `c<n>` and `z<n>` look alike but target different things on purpose:
// c<n> goes through the client's built-in `/z` enemy numbering, z<n> through the
// `set`-configured target slots. Reversing that has been a regression before.
describe('c / z attack aliases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', makeLocalStorageMock());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Dispatch like the client: first registered alias whose pattern matches wins.
  type Aliases = ReturnType<typeof createMockApi>['aliases'];
  const fire = (aliases: Aliases, input: string) => {
    const alias = aliases.find((a) => a.pattern.test(input));
    expect(alias, `no alias matched "${input}"`).toBeDefined();
    alias!.callback(input.match(alias!.pattern) as RegExpMatchArray);
  };

  it('c<n> attacks by the client enemy number, for any n', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    for (const n of ['1', '3', '12']) {
      fire(aliases, `c${n}`);
      expect(api.command.send).toHaveBeenCalledWith(`/z ${n}`);
    }
  });

  it('z<n> attacks the configured set slot, not the client number', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    fire(aliases, 'set orka');
    // z1..z4 re-enter the `z <n>` alias, which resolves the slot.
    fire(aliases, 'z2');
    expect(api.command.send).toHaveBeenCalledWith('z 2');
    fire(aliases, 'z 2');
    expect(api.command.send).toHaveBeenCalledWith('zabij 2. orka');
  });

  it('c with no argument attacks slot 1, c <text> kills by name', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    fire(aliases, 'set orka');
    fire(aliases, 'c');
    expect(api.command.send).toHaveBeenCalledWith('zabij orka');
    fire(aliases, 'c kota');
    expect(api.command.send).toHaveBeenCalledWith('zabij kota');
  });

  it('cc does zabij + wskaz + team order for leader', async () => {
    const { api, aliases } = createMockApi();
    // Leader: team with >1 member means we are the leader.
    vi.spyOn(api.team, 'getMembers').mockReturnValue(['jens', 'gertruda']);
    vi.spyOn(api.team, 'getLeaderId').mockReturnValue(1);
    vi.spyOn(api.team, 'getPlayerNum').mockReturnValue(1);
    await init(api);

    const ccAlias = aliases.find((a) => a.pattern.test('cc'));
    expect(ccAlias).toBeDefined();
    ccAlias!.callback(['cc'] as unknown as RegExpMatchArray);
    expect(api.command.send).toHaveBeenCalledWith('zabij INIT');
    expect(api.command.send).toHaveBeenCalledWith('wskaz INIT jako cel ataku');
    expect(api.command.send).toHaveBeenCalledWith('rozkaz druzynie zaatakowac INIT');
  });

  it('cc for follower skips team order, uses own target', async () => {
    const { api, aliases } = createMockApi();
    vi.spyOn(api.team, 'getMembers').mockReturnValue(['jens', 'gertruda']);
    vi.spyOn(api.team, 'getLeaderId').mockReturnValue(2);
    vi.spyOn(api.team, 'getPlayerNum').mockReturnValue(1);
    await init(api);

    const ccAlias = aliases.find((a) => a.pattern.test('cc'));
    expect(ccAlias).toBeDefined();
    ccAlias!.callback(['cc'] as unknown as RegExpMatchArray);
    // cc always attacks the user's own target, not the leader's
    expect(api.command.send).toHaveBeenCalledWith('zabij INIT');
    expect(api.command.send).not.toHaveBeenCalledWith('zabij cel ataku');
    expect(api.command.send).not.toHaveBeenCalledWith('wskaz ', expect.anything());
    expect(api.command.send).not.toHaveBeenCalledWith('rozkaz druzynie', expect.anything());
  });

  it('v without arg breaks', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const vAlias = aliases.find((a) => a.pattern.test('v'));
    expect(vAlias).toBeDefined();
    vAlias!.callback(['v'] as unknown as RegExpMatchArray);
    expect(api.command.send).toHaveBeenCalledWith('/prze');
  });

  it('v1 breaks numbered target', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const vAlias = aliases.find((a) => a.pattern.test('v1'));
    expect(vAlias).toBeDefined();
    vAlias!.callback(['v1', '1'] as unknown as RegExpMatchArray);
    expect(api.command.send).toHaveBeenCalledWith('/prze 1');
  });

  it('v for follower also attacks after break', async () => {
    const { api, aliases } = createMockApi();
    vi.spyOn(api.team, 'getMembers').mockReturnValue(['lider', 'jens']);
    vi.spyOn(api.team, 'getLeaderId').mockReturnValue(1);
    vi.spyOn(api.team, 'getPlayerNum').mockReturnValue(2);
    await init(api);

    const vAlias = aliases.find((a) => a.pattern.test('v'));
    expect(vAlias).toBeDefined();
    vAlias!.callback(['v'] as unknown as RegExpMatchArray);
    expect(api.command.send).toHaveBeenCalledWith('/prze');
    // Follower also attacks the leader's target after breaking
    expect(api.command.send).toHaveBeenCalledWith('c');
  });

  it('vv (solo) drops cover then breaks then orders team attack', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const vvAlias = aliases.find((a) => a.pattern.test('vv'));
    expect(vvAlias).toBeDefined();
    vvAlias!.callback(['vv'] as unknown as RegExpMatchArray);
    expect(api.command.send).toHaveBeenCalledWith('/prze');
    expect(api.command.send).toHaveBeenCalledWith('rozkaz druzynie zaatakowac cel ataku');
  });

  it('vv <name> (solo) drops cover then breaks and orders team attack on named target', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const vvAlias = aliases.find((a) => a.pattern.test('vv troll'));
    expect(vvAlias).toBeDefined();
    vvAlias!.callback(['vv troll', 'troll'] as unknown as RegExpMatchArray);
    expect(api.command.send).toHaveBeenCalledWith('/prze troll');
    expect(api.command.send).toHaveBeenCalledWith('rozkaz druzynie zaatakowac troll');
  });

  it('vv (follower) orders team FIRST then drops cover + breaks + c', async () => {
    const { api, aliases } = createMockApi();
    vi.spyOn(api.team, 'getMembers').mockReturnValue(['lider', 'jens']);
    vi.spyOn(api.team, 'getLeaderId').mockReturnValue(1);
    vi.spyOn(api.team, 'getPlayerNum').mockReturnValue(2);
    await init(api);

    const vvAlias = aliases.find((a) => a.pattern.test('vv'));
    expect(vvAlias).toBeDefined();
    vvAlias!.callback(['vv'] as unknown as RegExpMatchArray);
    // Follower orders team attack FIRST
    expect(api.command.send).toHaveBeenCalledWith('rozkaz druzynie zaatakowac cel ataku');
    // Then drops cover + breaks + attacks
    expect(api.command.send).toHaveBeenCalledWith('/prze');
    expect(api.command.send).toHaveBeenCalledWith('c');
  });

  it('vc (solo) breaks then kills then checks condition', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    const vcAlias = aliases.find((a) => a.pattern.test('vc'));
    expect(vcAlias).toBeDefined();
    vcAlias!.callback(['vc'] as unknown as RegExpMatchArray);
    expect(api.command.send).toHaveBeenCalledWith('/prze');
    expect(api.command.send).toHaveBeenCalledWith('zabij cel ataku');
    expect(api.command.send).toHaveBeenCalledWith('kondycja wszystkich');
  });

  it('vc (follower) checks condition FIRST then v + c + separator', async () => {
    const { api, aliases } = createMockApi();
    vi.spyOn(api.team, 'getMembers').mockReturnValue(['lider', 'jens']);
    vi.spyOn(api.team, 'getLeaderId').mockReturnValue(1);
    vi.spyOn(api.team, 'getPlayerNum').mockReturnValue(2);
    await init(api);

    const vcAlias = aliases.find((a) => a.pattern.test('vc'));
    expect(vcAlias).toBeDefined();
    vcAlias!.callback(['vc'] as unknown as RegExpMatchArray);
    // Follower: kondycja ALLES FIRST
    expect(api.command.send).toHaveBeenCalledWith('kondycja wszystkich');
    // Then v (which drops cover + breaks)
    expect(api.command.send).toHaveBeenCalledWith('v');
    // Then c (attacks the leader's target)
    expect(api.command.send).toHaveBeenCalledWith('c');
  });

  it('cv is a no-op when wrog_zlamany is empty', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    // When wrog_zlamany is empty, cv returns true without sending anything
    const cvAlias = aliases.find((a) => a.pattern.test('cv'));
    expect(cvAlias).toBeDefined();
    const result = cvAlias!.callback(['cv'] as unknown as RegExpMatchArray);
    expect(result).toBe(true);
    // No commands should have been sent since there's no wrog_zlamany
    expect(api.command.send).not.toHaveBeenCalledWith('zabij ', expect.anything());
  });
});
