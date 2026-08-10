import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApi, runLine, type MockApi } from '../../../helpers/mockApi';
import { setupTeam, destroyTeam } from '../../../../src/plugins/core-plugin/mod_team/team';
import {
  setShieldedAgainstMe,
  isShieldedAgainstMe,
} from '../../../../src/plugins/core-plugin/mod_team/team_state';
import { setupAtakPyk } from '../../../../src/plugins/core-plugin/pyk';
import { setupAntyflood } from '../../../../src/plugins/core-plugin/antyflood';

function sentCommands(mock: MockApi): string[] {
  return (mock.api.command.send as any).mock.calls.map(([cmd]: [string]) => cmd);
}

/** Everything the module printed, as plain text. */
function printedText(mock: MockApi): string[] {
  return (mock.api.output.print as any).mock.calls.map(([arg]: [any]) =>
    typeof arg === 'string' ? arg : (arg?.text ?? ''),
  );
}

/**
 * Every banner the module printed. Deliberately re-implements the shared format
 * from `team_lamanie.ts` rather than importing its helper, so a change to the
 * spacing or the padding has to be made in both places on purpose.
 */
const VERB_WIDTH = 35;

function letterspace(text: string): string {
  return text
    .split(' ')
    .map((w) => w.split('').join(' '))
    .join('   ');
}

function bars(mock: MockApi): string[] {
  return printedText(mock).filter((t) => /^ {2}(?:---|\+\+\+|\.\.\.) {2}/.test(t));
}

/** Assert exactly one bar with this polarity mark, verb and detail was printed. */
function expectBar(mock: MockApi, mark: string, verb: string, detail: string): void {
  const want = `  ${mark}  ${letterspace(verb).padEnd(VERB_WIDTH)}  ${mark}   ${detail}`;
  expect(bars(mock)).toContain(want);
}

/** Turn automatic attacking on (`pyk+`); returns the pyk teardown. */
function enablePyk(mock: MockApi): () => void {
  const cleanup = setupAtakPyk(mock.api);
  runAlias(mock, 'pyk+');
  return cleanup;
}

/** Fire the alias whose pattern matches `command`. */
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

/** Team with Vindael in slot 1 (B/D "Vindaela") and Soroko in slot 2. */
function teamOf(mock: MockApi, members: string[]): void {
  (mock.api.team.getMembers as any).mockReturnValue(members);
}

describe('mod_team — lamanie zaslony', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('alarms and arms the bind when an enemy breaks a teammate shield', () => {
    const mock = createMockApi();
    teamOf(mock, ['Vindael', 'Soroko']);
    setupTeam(mock.api);

    const text = 'Glupi troll rzuca sie na Soroko przebijajac sie przez jego ochrone.';
    const line = runLine(mock, text);

    // The game line survives verbatim; the alarm is a bar underneath it, and it
    // states the alarm exactly once. Soroko is team slot 2 → bind label "WW".
    expect(line!.text).toBe(text);
    expectBar(mock, '---', 'PRZELAMUJA DRUZYNE', 'Glupi troll -> Soroko  [WW]');
    expect(sentCommands(mock)).toContain('play_basso');
    expect(mock.api.bind.set).toHaveBeenCalledWith('WW', undefined, undefined);

    destroyTeam(mock.api);
  });

  it('handles the surprise variant of a broken teammate the same way', () => {
    const mock = createMockApi();
    teamOf(mock, ['Vindael']);
    setupTeam(mock.api);

    const text = 'Glupi troll wykorzystujac zaskoczenie przebija sie przez ochrone Vindaela.';
    const line = runLine(mock, text);

    expect(line!.text).toBe(text);
    expectBar(mock, '---', 'PRZELAMUJA DRUZYNE', 'Glupi troll -> Vindaela  [QQ]'); // slot 1
    expect(sentCommands(mock)).toContain('play_basso');

    destroyTeam(mock.api);
  });

  it('leaves a broken-shield line alone when the victim is not on the team', () => {
    const mock = createMockApi();
    teamOf(mock, ['Vindael']);
    setupTeam(mock.api);

    const text = 'Glupi troll rzuca sie na orka przebijajac sie przez jego ochrone.';
    const line = runLine(mock, text);

    expect(line!.text).toBe(text);
    expect(sentCommands(mock)).not.toContain('play_basso');
    expect(mock.api.bind.set).not.toHaveBeenCalled();

    destroyTeam(mock.api);
  });

  it('binds rz when the player themselves is broken through', () => {
    const mock = createMockApi();
    teamOf(mock, ['Vindael']);
    setupTeam(mock.api);

    const text = 'Glupi troll rzuca sie na ciebie przebijajac sie przez twoja ochrone.';
    const line = runLine(mock, text);

    // The game line stays intact; the alarm bar is printed underneath it.
    expect(line!.text).toBe(text);
    expectBar(mock, '---', 'PRZELAMALI CIE', 'Glupi troll');
    expect(sentCommands(mock)).toContain('play_basso');
    expect(mock.api.bind.set).toHaveBeenCalledWith('rz', undefined, undefined);

    destroyTeam(mock.api);
  });

  it('binds rz on the surprise variant too', () => {
    const mock = createMockApi();
    setupTeam(mock.api);

    const text = 'Glupi troll wykorzystujac zaskoczenie przebija sie przez twoja ochrone.';
    const line = runLine(mock, text);

    expect(line!.text).toBe(text);
    expectBar(mock, '---', 'PRZELAMALI CIE', 'Glupi troll');
    expect(mock.api.bind.set).toHaveBeenCalledWith('rz', undefined, undefined);

    destroyTeam(mock.api);
  });

  describe('teammate breaks an enemy shield', () => {
    it('banners + morse, and attacks when that enemy was shielded from us', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);
      const cleanupPyk = enablePyk(mock);

      // The enemy was shielding against our blows.
      runLine(mock, 'Goblin zrecznie zaslania zielonego trolla przed twoimi ciosami.');
      expect(isShieldedAgainstMe()).toBe(true);

      const text = 'Vindael rzuca sie na zielonego trolla przebijajac sie przez jego ochrone.';
      const line = runLine(mock, text);

      // The game line stays intact; the bar and the bind come on top of it.
      expect(line!.text).toBe(text);
      expectBar(mock, '+++', 'DRUZYNA PRZELAMALA', 'Vindael -> zielonego trolla');
      expect(sentCommands(mock)).toContain('play_morse');
      expect(mock.api.bind.set).toHaveBeenCalledWith('c zielonego trolla', undefined, undefined);

      vi.advanceTimersByTime(700);
      expect(sentCommands(mock)).toContain('c');
      expect(isShieldedAgainstMe()).toBe(false);

      cleanupPyk();
      destroyTeam(mock.api);
    });

    it('does not attack when nobody was shielded from us', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);
      const cleanupPyk = enablePyk(mock);

      runLine(mock, 'Vindael rzuca sie na zielonego trolla przebijajac sie przez jego ochrone.');
      vi.advanceTimersByTime(700);

      expect(sentCommands(mock)).toContain('play_morse');
      expect(sentCommands(mock)).not.toContain('c');

      cleanupPyk();
      destroyTeam(mock.api);
    });

    it('does not attack while pyk is off, even with a shielded target', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);

      setShieldedAgainstMe(true);
      runLine(mock, 'Vindael rzuca sie na zielonego trolla przebijajac sie przez jego ochrone.');
      vi.advanceTimersByTime(700);

      expect(sentCommands(mock)).toContain('play_morse'); // banner side still runs
      expect(sentCommands(mock)).not.toContain('c');
      // The flag is left alone so the attack can still happen once pyk is on.
      expect(isShieldedAgainstMe()).toBe(true);

      destroyTeam(mock.api);
    });

    it('holds the auto-attack on cooldown for 3 s', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);
      const cleanupPyk = enablePyk(mock);

      const brzek = 'Vindael rzuca sie na zielonego trolla przebijajac sie przez jego ochrone.';

      setShieldedAgainstMe(true);
      runLine(mock, brzek);
      vi.advanceTimersByTime(700);
      expect(sentCommands(mock).filter((c) => c === 'c')).toHaveLength(1);

      // Still inside the 3 s window — a second break must not re-fire.
      setShieldedAgainstMe(true);
      runLine(mock, brzek);
      vi.advanceTimersByTime(700);
      expect(sentCommands(mock).filter((c) => c === 'c')).toHaveLength(1);

      // Past the window it fires again.
      vi.advanceTimersByTime(3000);
      setShieldedAgainstMe(true);
      runLine(mock, brzek);
      vi.advanceTimersByTime(700);
      expect(sentCommands(mock).filter((c) => c === 'c')).toHaveLength(2);

      cleanupPyk();
      destroyTeam(mock.api);
    });

    it('ignores a break by someone who is not on the team', () => {
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);

      const text = 'Obcy rzuca sie na zielonego trolla przebijajac sie przez jego ochrone.';
      const line = runLine(mock, text);

      expect(line!.text).toBe(text);
      expect(sentCommands(mock)).not.toContain('play_morse');

      destroyTeam(mock.api);
    });
  });

  describe('the player breaks (or fails to break) a shield', () => {
    it('banners the success and resumes the team target when in a team', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);
      const cleanupPyk = enablePyk(mock);

      const text = 'Rzucasz sie na glupiego trolla przebijajac sie przez jego ochrone.';
      const line = runLine(mock, text);

      expect(line!.text).toBe(text);
      expectBar(mock, '+++', 'przelamales', 'glupiego trolla');
      expect(sentCommands(mock)).toContain('play_morse');

      vi.advanceTimersByTime(250);
      expect(sentCommands(mock)).toContain('c cel ataku');

      cleanupPyk();
      destroyTeam(mock.api);
    });

    it('does not resume the team target when solo', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      teamOf(mock, []);
      setupTeam(mock.api);
      const cleanupPyk = enablePyk(mock);

      runLine(mock, 'Rzucasz sie na glupiego trolla przebijajac sie przez jego ochrone.');
      vi.advanceTimersByTime(250);

      expect(sentCommands(mock)).not.toContain('c cel ataku');

      cleanupPyk();
      destroyTeam(mock.api);
    });

    it('does not resume the team target while pyk is off', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);

      runLine(mock, 'Rzucasz sie na glupiego trolla przebijajac sie przez jego ochrone.');
      vi.advanceTimersByTime(250);

      expect(sentCommands(mock)).toContain('play_morse');
      expect(sentCommands(mock)).not.toContain('c cel ataku');

      destroyTeam(mock.api);
    });

    it('banners a failed break attempt', () => {
      const mock = createMockApi();
      setupTeam(mock.api);

      const text =
        'Bezskutecznie rzucasz sie na glupiego trolla, probujac przebic sie przez jego ochrone.';
      const line = runLine(mock, text);

      expect(line!.text).toBe(text);
      expectBar(mock, '---', 'nie przelamales', 'glupiego trolla');

      destroyTeam(mock.api);
    });
  });

  describe('arlekin / blaviken variants', () => {
    it('alarms when a dancer walks through a teammate guard (dopelniacz)', () => {
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);

      const text = 'Arlekin tanecznym krokiem z latwoscia mija obrone Vindaela.';
      const line = runLine(mock, text);

      expect(line!.text).toBe(text);
      expectBar(mock, '---', 'ARLEKIN OMIJA', 'Arlekin -> Vindaela  [QQ]');
      expect(sentCommands(mock)).toContain('play_basso');

      destroyTeam(mock.api);
    });

    it('alarms on the blaviken drift line', () => {
      const mock = createMockApi();
      teamOf(mock, ['Vindael', 'Soroko']);
      setupTeam(mock.api);

      const text =
        'Blaviken przekreca sie w strone Vindaela, wbijajac w niego swe niewidzace spojrzenie. ' +
        'Po chwili, bez cienia zawahania zaczyna dryfowac w jego kierunku, na wskros przenikajac ciernisty zywoplot.';
      const line = runLine(mock, text);

      expect(line!.text).toBe(text);
      expectBar(mock, '---', 'PRZELAMUJA DRUZYNE', 'Blaviken -> Vindaela  [QQ]');
      expect(sentCommands(mock)).toContain('play_basso');

      destroyTeam(mock.api);
    });
  });

  describe('target shielding state', () => {
    it('flags a shielded target and notes who is in the way', () => {
      const mock = createMockApi();
      setupTeam(mock.api);

      const text = 'Atakujesz glupiego trolla, lecz goblin zagradza ci droge.';
      const line = runLine(mock, text);

      expect(line!.text).toBe(text);
      expectBar(mock, '...', 'cel zasloniety', 'goblin -> glupiego trolla');
      expect(isShieldedAgainstMe()).toBe(true);

      destroyTeam(mock.api);
    });

    it('clears the flag and names the enemy that opened up', () => {
      const mock = createMockApi();
      setupTeam(mock.api);
      setShieldedAgainstMe(true);

      const text = 'Nikt nie zaslania glupiego trolla.';
      const line = runLine(mock, text);

      // The old rewrite reduced this line to bare "czysty", losing the name.
      expect(line!.text).toBe(text);
      expectBar(mock, '...', 'czysty', 'glupiego trolla');
      expect(isShieldedAgainstMe()).toBe(false);

      destroyTeam(mock.api);
    });
  });

  it('aligns the detail column across banners of very different verb lengths', () => {
    const mock = createMockApi();
    teamOf(mock, ['Vindael']);
    setupTeam(mock.api);

    runLine(mock, 'Nikt nie zaslania glupiego trolla.'); // shortest verb
    runLine(mock, 'Vindael rzuca sie na orka przebijajac sie przez jego ochrone.'); // longest

    const [short, long] = bars(mock);
    expect(short.indexOf('glupiego trolla')).toBe(long.indexOf('Vindael -> orka'));

    destroyTeam(mock.api);
  });

  describe('antyflood', () => {
    it('suppresses a teammate failed break by default', () => {
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);

      const line = runLine(
        mock,
        'Vindael rzuca sie na glupiego trolla, bezskutecznie probujac przebic sie przez jego ochrone.',
      );

      expect(line).toBeNull();

      destroyTeam(mock.api);
    });

    it('follows the shared antyflood level (af0 shows the line again)', () => {
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      const cleanupAntyflood = setupAntyflood(mock.api);
      setupTeam(mock.api);

      const text =
        'Vindael rzuca sie na glupiego trolla, bezskutecznie probujac przebic sie przez jego ochrone.';

      runAlias(mock, 'af0');
      expect(runLine(mock, text)!.text).toBe(text);

      runAlias(mock, 'af1');
      expect(runLine(mock, text)).toBeNull();

      destroyTeam(mock.api);
      cleanupAntyflood();
    });

    it('never suppresses a non-teammate failed break', () => {
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);

      const text =
        'Obcy rzuca sie na glupiego trolla, bezskutecznie probujac przebic sie przez jego ochrone.';
      expect(runLine(mock, text)!.text).toBe(text);

      destroyTeam(mock.api);
    });
  });

  describe('lamanietest!', () => {
    it('replays every sample line through the real handlers without touching the game', () => {
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);
      const cleanupPyk = enablePyk(mock);
      (mock.api.command.send as any).mockClear();

      runAlias(mock, 'lamanietest!');
      const out = printedText(mock).join('\n');

      // Every banner shows up, all in the shared letterspaced form...
      for (const verb of [
        'cel zasloniety',
        'czysty',
        'PRZELAMUJA DRUZYNE',
        'PRZELAMALI CIE',
        'DRUZYNA PRZELAMALA',
        'przelamales',
        'nie przelamales',
        'ARLEKIN OMIJA',
      ]) {
        expect(out).toContain(letterspace(verb));
      }
      // ...the antyflood line is reported as gagged...
      expect(out).toContain('[gag]');
      // ...and side effects are only described, never executed.
      expect(out).toContain('[test] play_basso');
      expect(out).toContain('[test] f+ rz');
      expect(sentCommands(mock)).toEqual([]);
      expect(mock.api.bind.set).not.toHaveBeenCalled();

      cleanupPyk();
      destroyTeam(mock.api);
    });

    it('warns when the team is empty', () => {
      const mock = createMockApi();
      teamOf(mock, []);
      setupTeam(mock.api);

      runAlias(mock, 'lamanietest!');
      expect(printedText(mock).join('\n')).toContain('druzyna pusta');

      destroyTeam(mock.api);
    });
  });

  it('lamanieres! clears the shielded-against-me flag', () => {
    const mock = createMockApi();
    setupTeam(mock.api);
    setShieldedAgainstMe(true);

    runAlias(mock, 'lamanieres!');
    expect(isShieldedAgainstMe()).toBe(false);

    destroyTeam(mock.api);
  });
});
