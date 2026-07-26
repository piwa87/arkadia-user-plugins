import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApi, runLine, type MockApi } from '../../helpers/mockApi';
import { setupAntyflood, getAntyfloodLevel } from '../../../src/plugins/core-plugin/antyflood';
import { setupTeam, destroyTeam } from '../../../src/plugins/core-plugin/mod_team/team';

function runAlias(mock: MockApi, command: string): void {
  for (const alias of mock.aliases) {
    const matches = command.match(alias.pattern);
    if (matches) {
      alias.callback(matches);
      return;
    }
  }
  throw new Error(`brak aliasu dla: ${command}`);
}

/** Lines CMUD hid from level 1 up. */
const LEVEL_1_LINES = [
  'Vindael wychodzi zza zaslony orka i rusza do walki.',
  'Vindael przestaje cie zaslaniac przed ciosami orka.',
  'Vindael przestaje zaslaniac Soroko przed ciosami orka.',
  'Blaviken czyni dlonia ruch, jakby chciala zaslonic sie przed toba.',
  'Ork probuje zaatakowac Vindaela, lecz goblin zagradza mu droge.',
  'Ork probuje cie zaatakowac, lecz goblin zagradza mu droge.',
  'Ork probuje wesprzec goblina, lecz troll zagradza mu droge.',
  'Mezny gwardzista krzyczy: Stac!',
  'Dzielny oficer wspiera gwardziste w walce z orkiem.',
];

/** Line CMUD hid only from level 2 up. */
const LEVEL_2_LINE = 'Vindael siega do pochwy, dobywajac z niej miecza.';

describe('antyflood', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to level 1 and hides the noisy lines', () => {
    const mock = createMockApi();
    const cleanup = setupAntyflood(mock.api);

    expect(getAntyfloodLevel()).toBe(1);
    for (const text of LEVEL_1_LINES) {
      expect(runLine(mock, text), text).toBeNull();
    }

    cleanup();
  });

  it('keeps weapon drawing until af2', () => {
    const mock = createMockApi();
    const cleanup = setupAntyflood(mock.api);

    expect(runLine(mock, LEVEL_2_LINE)!.text).toBe(LEVEL_2_LINE);

    runAlias(mock, 'af2');
    expect(getAntyfloodLevel()).toBe(2);
    expect(runLine(mock, LEVEL_2_LINE)).toBeNull();
    // Level 1 lines stay hidden at level 2.
    expect(runLine(mock, LEVEL_1_LINES[0])).toBeNull();

    cleanup();
  });

  it('af0 shows everything again', () => {
    const mock = createMockApi();
    const cleanup = setupAntyflood(mock.api);

    runAlias(mock, 'af0');
    expect(getAntyfloodLevel()).toBe(0);
    for (const text of [...LEVEL_1_LINES, LEVEL_2_LINE]) {
      expect(runLine(mock, text)!.text, text).toBe(text);
    }

    runAlias(mock, 'af1');
    expect(runLine(mock, LEVEL_1_LINES[0])).toBeNull();

    cleanup();
  });

  it('antyflood+ / antyflood- map onto levels 1 and 0', () => {
    const mock = createMockApi();
    const cleanup = setupAntyflood(mock.api);

    runAlias(mock, 'antyflood-');
    expect(getAntyfloodLevel()).toBe(0);
    runAlias(mock, 'antyflood+');
    expect(getAntyfloodLevel()).toBe(1);

    cleanup();
  });

  it('remembers the level across a reload', () => {
    const first = createMockApi();
    const cleanupFirst = setupAntyflood(first.api);
    runAlias(first, 'af2');
    cleanupFirst();

    const second = createMockApi();
    const cleanupSecond = setupAntyflood(second.api);
    expect(getAntyfloodLevel()).toBe(2);
    cleanupSecond();
  });

  it('reads a boolean left by the older antyflood+/- storage', () => {
    store['p:antyflood'] = 'false';

    const mock = createMockApi();
    const cleanup = setupAntyflood(mock.api);

    expect(getAntyfloodLevel()).toBe(0);
    expect(runLine(mock, LEVEL_1_LINES[0])!.text).toBe(LEVEL_1_LINES[0]);

    cleanup();
  });

  it('reformats weapon drawing below af2 and hides it at af2', () => {
    const mock = createMockApi();
    const cleanup = setupAntyflood(mock.api);

    const line = runLine(mock, 'Vindael dobywa miecza.');
    expect(line!.text).toBe('Vindael   d o b y w a   miecza.');

    runAlias(mock, 'af2');
    expect(runLine(mock, 'Vindael dobywa miecza.')).toBeNull();

    cleanup();
  });

  describe('team lines (level shared with mod_team)', () => {
    it('hides teammates attack lines at af2 only', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      const cleanup = setupAntyflood(mock.api);
      setupTeam(mock.api);

      const text = 'Vindael atakuje glupiego trolla.';
      expect(runLine(mock, text)!.text).toBe(text);

      runAlias(mock, 'af2');
      expect(runLine(mock, text)).toBeNull();
      // Somebody else attacking stays visible even at af2.
      const other = 'Obcy atakuje glupiego trolla.';
      expect(runLine(mock, other)!.text).toBe(other);

      destroyTeam(mock.api);
      cleanup();
    });

    it('hides teammates failed shield-breaks from af1 up', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      const cleanup = setupAntyflood(mock.api);
      setupTeam(mock.api);

      const text =
        'Vindael rzuca sie na glupiego trolla, bezskutecznie probujac przebic sie przez jego ochrone.';
      expect(runLine(mock, text)).toBeNull();

      runAlias(mock, 'af0');
      expect(runLine(mock, text)!.text).toBe(text);

      destroyTeam(mock.api);
      cleanup();
    });
  });

  it('leaves ordinary combat lines alone', () => {
    const mock = createMockApi();
    const cleanup = setupAntyflood(mock.api);

    const text = 'Vindael zrecznie zaslania Soroko przed ciosami orka.';
    expect(runLine(mock, text)!.text).toBe(text);

    cleanup();
  });
});
