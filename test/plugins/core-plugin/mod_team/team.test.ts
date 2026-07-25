import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockApi, runLine, type MockApi } from '../../../helpers/mockApi';
import {
  setupTeam,
  destroyTeam,
  getCurrentTeam,
  getCurrentLeader,
  getMissingNames,
} from '../../../../src/plugins/core-plugin/mod_team/team';
import {
  forgetLearnedNames,
  getLearnedNames,
} from '../../../../src/plugins/core-plugin/mod_team/team_state';

function sentCommands(mock: ReturnType<typeof createMockApi>): string[] {
  return (mock.api.command.send as any).mock.calls.map(([cmd]: [string]) => cmd);
}

describe('mod_team', () => {
  it('builds the live team as declension objects from the DB', () => {
    const { api } = createMockApi();
    // Vindael is a known masculine name; Soroko is indeclinable.
    (api.team.getMembers as any).mockReturnValue(['Vindael', 'Soroko']);
    (api.team.getLeader as any).mockReturnValue('Vindael');

    setupTeam(api);

    const team = getCurrentTeam();
    expect(team.map((m) => m.M)).toEqual(['Vindael', 'Soroko']);
    // Known entry carries real declensions from the DB.
    expect(team[0]).toMatchObject({
      M: 'Vindael',
      B: 'Vindaela',
      C: 'Vindaelowi',
      D: 'Vindaela',
      N: 'Vindaelem',
    });
    expect(getCurrentLeader()?.M).toBe('Vindael');
    expect(getMissingNames()).toEqual([]);

    destroyTeam(api);
  });

  it('matches names case-insensitively against the DB', () => {
    const { api } = createMockApi();
    (api.team.getMembers as any).mockReturnValue(['vindael']);

    setupTeam(api);
    expect(getCurrentTeam()[0]).toMatchObject({ B: 'Vindaela' });
    destroyTeam(api);
  });

  it('falls back for unknown names, warns, and arms the wylap bind', () => {
    const { api } = createMockApi();
    (api.team.getMembers as any).mockReturnValue(['Vindael', 'Nieznany']);

    setupTeam(api);

    const team = getCurrentTeam();
    // Unknown name becomes a fallback object with every case equal to the raw name.
    expect(team[1]).toEqual({
      M: 'Nieznany',
      B: 'Nieznany',
      C: 'Nieznany',
      D: 'Nieznany',
      N: 'Nieznany',
    });
    expect(getMissingNames()).toEqual(['Nieznany']);

    // Warning printed and the functional bind armed to fire wylap. The
    // printable must be non-null or the client never dispatches the key press.
    expect(api.output.print).toHaveBeenCalled();
    expect(api.bind.set).toHaveBeenCalledWith('wylap', expect.any(Function));

    destroyTeam(api);
  });

  it('skips the player ("Ty (gracz)") entirely — no team entry, no warning', () => {
    const { api } = createMockApi();
    (api.team.getMembers as any).mockReturnValue(['Ty (gracz)', 'Vindael']);
    (api.team.getLeader as any).mockReturnValue('Ty (gracz)');

    setupTeam(api);

    expect(getCurrentTeam().map((m) => m.M)).toEqual(['Vindael']);
    expect(getCurrentLeader()).toBeUndefined();
    expect(getMissingNames()).toEqual([]);
    expect(api.bind.set).not.toHaveBeenCalled();

    destroyTeam(api);
  });

  it('rebuilds when the teamChange event fires', () => {
    const { api } = createMockApi();
    (api.team.getMembers as any).mockReturnValue([]);
    setupTeam(api);
    expect(getCurrentTeam()).toEqual([]);

    (api.team.getMembers as any).mockReturnValue(['Soroko']);
    api.events.emit('teamChange');
    expect(getCurrentTeam().map((m) => m.M)).toEqual(['Soroko']);

    destroyTeam(api);
  });

  describe('wylap (odmiana capture)', () => {
    afterEach(() => {
      vi.useRealTimers();
      forgetLearnedNames();
    });

    /** Fire the functional bind the missing-name warning armed. */
    function fireBind(mock: MockApi): void {
      const calls = (mock.api.bind.set as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      calls[calls.length - 1][1]();
    }

    function replyOdmien(mock: MockApi, forms: Record<string, string>): void {
      runLine(mock, `${forms.M} odmienia sie nastepujaco:`);
      runLine(mock, '');
      runLine(mock, `  Mianownik: ${forms.M},`);
      runLine(mock, ` Dopelniacz: ${forms.D},`);
      runLine(mock, `   Celownik: ${forms.C},`);
      runLine(mock, `    Biernik: ${forms.B},`);
      runLine(mock, `  Narzednik: ${forms.N},`);
      runLine(mock, `Miejscownik: ${forms.Ms}.`);
    }

    const JASKO = { M: 'Jasko', D: 'Jaska', C: 'Jaskowi', B: 'Jaska', N: 'Jaskiem', Ms: 'Jasku' };

    it('asks the game to decline missing names and learns the forms', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Jasko']);
      setupTeam(mock.api);
      expect(getMissingNames()).toEqual(['Jasko']);

      fireBind(mock);
      expect(sentCommands(mock)).toContain('odmien Jasko');

      replyOdmien(mock, JASKO);
      vi.runAllTimers(); // completion delay + the final team rebuild

      expect(getLearnedNames()).toEqual([
        { M: 'Jasko', B: 'Jaska', C: 'Jaskowi', D: 'Jaska', N: 'Jaskiem' },
      ]);
      // The rebuild resolves the name from the learned entry — no longer missing.
      expect(getMissingNames()).toEqual([]);
      expect(getCurrentTeam()[0]).toMatchObject({ M: 'Jasko', B: 'Jaska', N: 'Jaskiem' });
      // Parsers are armed on demand only — nothing left on the per-line walk.
      expect(mock.triggers).toHaveLength(0);
      expect(mock.oneTimeTriggers).toHaveLength(0);

      destroyTeam(mock.api);
    });

    it('walks the whole queue of missing names one command at a time', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Jasko', 'Bolko']);
      setupTeam(mock.api);

      fireBind(mock);
      expect(sentCommands(mock)).toContain('odmien Jasko');
      expect(sentCommands(mock)).not.toContain('odmien Bolko');

      replyOdmien(mock, JASKO);
      // Only the inter-command gap — running all timers here would also fire
      // Bolko's freshly armed watchdog.
      vi.advanceTimersByTime(700);
      expect(sentCommands(mock)).toContain('odmien Bolko');

      replyOdmien(mock, { M: 'Bolko', D: 'Bolka', C: 'Bolkowi', B: 'Bolka', N: 'Bolkiem', Ms: 'Bolku' });
      vi.runAllTimers();

      expect(getLearnedNames().map((e) => e.M)).toEqual(['Jasko', 'Bolko']);
      expect(getMissingNames()).toEqual([]);

      destroyTeam(mock.api);
    });

    it('gives up on a name the game never answers and disarms the parsers', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Nieznany']);
      setupTeam(mock.api);

      fireBind(mock);
      expect(mock.triggers.length).toBeGreaterThan(0); // armed while waiting

      vi.advanceTimersByTime(5000); // watchdog
      vi.runAllTimers();

      expect(getLearnedNames()).toEqual([]);
      expect(getMissingNames()).toEqual(['Nieznany']);
      expect(mock.triggers).toHaveLength(0);
      expect(mock.oneTimeTriggers).toHaveLength(0);

      destroyTeam(mock.api);
    });

    it('does not touch the line — the game odmien block still prints', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Jasko']);
      setupTeam(mock.api);
      fireBind(mock);

      const header = 'Jasko odmienia sie nastepujaco:';
      expect(runLine(mock, header)!.text).toBe(header);
      const biernik = '    Biernik: Jaska,';
      expect(runLine(mock, biernik)!.text).toBe(biernik);

      destroyTeam(mock.api);
    });

    it('wylap lista prints learned entries, wylap zapomnij drops them', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Jasko']);
      setupTeam(mock.api);

      fireBind(mock);
      replyOdmien(mock, JASKO);
      vi.runAllTimers();

      const wylap = mock.aliases.find((a) => a.pattern.test('wylap'))!;
      (mock.api.output.print as any).mockClear();
      wylap.callback(['wylap lista', 'lista'] as unknown as RegExpMatchArray);
      const printed = (mock.api.output.print as any).mock.calls.map(([b]: [any]) => b?.text ?? String(b));
      expect(printed.some((t: string) => t.includes("{ M: 'Jasko', B: 'Jaska'"))).toBe(true);

      wylap.callback(['wylap zapomnij', 'zapomnij'] as unknown as RegExpMatchArray);
      expect(getLearnedNames()).toEqual([]);
      expect(getMissingNames()).toEqual(['Jasko']);

      destroyTeam(mock.api);
    });

    it('fails a name at once when the game answers "Odmien <kto/co>?"', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Nieznany', 'Jasko']);
      setupTeam(mock.api);

      fireBind(mock);
      runLine(mock, 'Odmien <kto/co>?');
      vi.advanceTimersByTime(700); // the completion gap, well under the 5s watchdog

      // Moved straight on to the next name instead of waiting out the watchdog.
      expect(sentCommands(mock)).toContain('odmien Jasko');
      expect(getLearnedNames()).toEqual([]);

      destroyTeam(mock.api);
    });

    it('wylap <imie> declines an explicit name, whatever the team state', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue([]); // nothing missing
      setupTeam(mock.api);

      const wylap = mock.aliases.find((a) => a.pattern.test('wylap'))!;
      wylap.callback(['wylap jasko', 'jasko'] as unknown as RegExpMatchArray);
      expect(sentCommands(mock)).toContain('odmien jasko');

      // The game answers with the canonical mianownik — that is what gets stored.
      replyOdmien(mock, JASKO);
      vi.runAllTimers();
      expect(getLearnedNames()).toEqual([
        { M: 'Jasko', B: 'Jaska', C: 'Jaskowi', D: 'Jaska', N: 'Jaskiem' },
      ]);

      destroyTeam(mock.api);
    });

    it('wylap <imie> <imie> queues several explicit names', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue([]);
      setupTeam(mock.api);

      const wylap = mock.aliases.find((a) => a.pattern.test('wylap'))!;
      wylap.callback(['wylap Jasko Bolko', 'Jasko Bolko'] as unknown as RegExpMatchArray);
      expect(sentCommands(mock)).toContain('odmien Jasko');

      replyOdmien(mock, JASKO);
      vi.advanceTimersByTime(700);
      expect(sentCommands(mock)).toContain('odmien Bolko');

      destroyTeam(mock.api);
    });

    it('refuses to start a second capture while one is running', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Jasko']);
      setupTeam(mock.api);

      fireBind(mock);
      fireBind(mock);
      expect(sentCommands(mock).filter((c) => c === 'odmien Jasko')).toHaveLength(1);

      destroyTeam(mock.api);
    });
  });

  describe('zaslona triggers', () => {
    it('rewrites into PRZED DRUZYNA + morse when the attacker is a teammate (dopelniacz)', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']); // D form: "Vindaela"
      setupTeam(mock.api);

      const line = runLine(mock, 'Goblin zrecznie zaslania orka przed ciosami Vindaela.');
      expect(line!.text).toContain('PRZED DRUZYNA');
      expect(line!.text).toContain('z a s l a n i a');
      expect(line!.text).toContain('Goblin');
      expect(line!.text).toContain('orka');
      expect(line!.text).toContain('Vindaela');
      expect(sentCommands(mock).filter((c) => c === 'play_morse')).toHaveLength(1);

      destroyTeam(mock.api);
    });

    it('passes the line through unchanged when nobody involved is on the team', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);

      const text = 'Goblin zrecznie zaslania orka przed ciosami Obcego.';
      const line = runLine(mock, text);
      expect(line!.text).toBe(text);
      expect(sentCommands(mock)).not.toContain('play_morse');

      destroyTeam(mock.api);
    });

    it('rewrites into the +++ CIEBIE banner when a teammate shields the player (no morse)', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);

      const line = runLine(mock, 'Vindael zrecznie zaslania cie przed ciosami orka.');
      expect(line!.text).toContain('+++');
      expect(line!.text).toContain('CIEBIE');
      expect(line!.text).toContain('Vindael');
      expect(sentCommands(mock)).not.toContain('play_morse');

      destroyTeam(mock.api);
    });

    it('rewrites when a member shields another team member (biernik, no morse)', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael', 'Soroko']);
      setupTeam(mock.api);

      const line = runLine(mock, 'Vindael zrecznie zaslania Soroko przed ciosami orka.');
      expect(line!.text).toContain('+++');
      expect(line!.text).toContain('Vindael');
      expect(line!.text).toContain('Soroko');
      expect(sentCommands(mock)).not.toContain('play_morse');

      destroyTeam(mock.api);
    });

    it('failed team shield leads with the bind label of the shielded member', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael', 'Soroko']);
      setupTeam(mock.api);

      const line = runLine(
        mock,
        'Vindael probuje zaslonic Soroko przed ciosami orka, jednak nie jest w stanie tego uczynic.',
      );
      expect(line!.text).toContain('n i e   z a s l a n i a');
      // Soroko is team slot 2 → bind label "WW".
      expect(line!.text).toContain('WW');
      expect(sentCommands(mock)).not.toContain('play_morse');

      destroyTeam(mock.api);
    });

    it('rewrites PRZED TOBA + morse when someone is shielded from the player', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue([]);
      setupTeam(mock.api);

      const line = runLine(mock, 'Goblin zrecznie zaslania orka przed twoimi ciosami.');
      expect(line!.text).toContain('PRZED TOBA');
      expect(sentCommands(mock).filter((c) => c === 'play_morse')).toHaveLength(1);

      destroyTeam(mock.api);
    });

    it('plays morse only (line intact) when an enemy dodges the player', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue([]);
      setupTeam(mock.api);

      const text = 'Goblin z wprawa staje pomiedzy toba a orkiem, przyjmujac na siebie twoje nadchodzace ciosy.';
      const line = runLine(mock, text);
      expect(line!.text).toBe(text);
      expect(sentCommands(mock).filter((c) => c === 'play_morse')).toHaveLength(1);

      destroyTeam(mock.api);
    });
  });

  describe('atak triggers', () => {
    it('rewrites "atakuje cie!" into the atak banner with a ding', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue([]);
      setupTeam(mock.api);

      const line = runLine(mock, 'Wsciekly szczur atakuje cie!');
      expect(line!.text).toContain('atak');
      expect(line!.text).toContain('CIE!');
      expect(sentCommands(mock)).toContain('play_ding');

      destroyTeam(mock.api);
    });

    it('marks an attack on a teammate with their bind label', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']); // B form: "Vindaela"
      setupTeam(mock.api);

      const line = runLine(mock, 'Ogromny ork atakuje Vindaela.');
      expect(line!.text).toContain('atak');
      expect(line!.text).toContain('QQ');
      expect(sentCommands(mock)).toContain('play_ding');

      destroyTeam(mock.api);
    });

    it('ignores "Nikt nie atakuje" and non-teammate targets', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);

      const t1 = 'Nikt nie atakuje ciebie.';
      expect(runLine(mock, t1)!.text).toBe(t1);
      const t2 = 'Ogromny ork atakuje krasnoluda.';
      expect(runLine(mock, t2)!.text).toBe(t2);
      expect(sentCommands(mock)).not.toContain('play_ding');

      destroyTeam(mock.api);
    });

    it('fires the kill follow-up for own and teammate kills only', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);

      runLine(mock, 'Zabiles wscieklego szczura.');
      expect(sentCommands(mock).filter((c) => c === 'next!')).toHaveLength(1);

      runLine(mock, 'Vindael zabil wscieklego szczura.');
      expect(sentCommands(mock).filter((c) => c === 'next!')).toHaveLength(2);

      runLine(mock, 'Obcy zabil wscieklego szczura.');
      expect(sentCommands(mock).filter((c) => c === 'next!')).toHaveLength(2);

      destroyTeam(mock.api);
    });

    it('panic line raises a notification banner', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue([]);
      setupTeam(mock.api);

      const line = runLine(mock, 'Wpadasz w panike!');
      expect(line!.text).toContain('PANIKA');
      expect(sentCommands(mock)).toContain('play_ding');

      destroyTeam(mock.api);
    });

    it('stun line prints the OGLUSZENIE alarm and leaves the line intact', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue([]);
      setupTeam(mock.api);
      (mock.api.output.print as any).mockClear();

      const text = 'Ogromny ork silnym ciosem obucha oglusza cie potwornie.';
      const line = runLine(mock, text);
      expect(line!.text).toBe(text);
      const printed = (mock.api.output.print as any).mock.calls.map(([b]: [any]) => b?.text ?? String(b));
      expect(printed.some((t: string) => t.includes('OGLUSZENIE'))).toBe(true);

      destroyTeam(mock.api);
    });
  });

  describe('cel triggers', () => {
    it('rewrites own and others attack-target lines into the cel ataku banner', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue([]);
      setupTeam(mock.api);

      const own = runLine(mock, 'Wskazujesz Cresa jako cel ataku.');
      expect(own!.text).toContain('cel ataku');
      const other = runLine(mock, 'Isil wskazuje Cresa jako cel ataku.');
      expect(other!.text).toContain('cel ataku');

      destroyTeam(mock.api);
    });

    it('defense-target line from others requires a teammate speaker', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);

      const fromTeam = runLine(mock, 'Vindael wskazuje Cresa jako cel obrony.');
      expect(fromTeam!.text).toContain('cel obrony');

      const stranger = 'Obcy wskazuje Cresa jako cel obrony.';
      expect(runLine(mock, stranger)!.text).toBe(stranger);

      destroyTeam(mock.api);
    });
  });

  describe('prowadzenie (leadership handover)', () => {
    it('rewrites the line when you hand leadership over', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);

      const line = runLine(mock, 'Przekazujesz prowadzenie druzyny Vindaelowi.');
      expect(line!.text).toContain('PRZEKAZUJESZ PROWADZENIE');
      expect(line!.text).toContain('Vindaelowi');

      destroyTeam(mock.api);
    });

    it('prints the PROWADZISZ banner and keeps the line when you take over', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);
      (mock.api.output.print as any).mockClear();

      const text = 'Vindael przekazuje ci prowadzenie druzyny.';
      expect(runLine(mock, text)!.text).toBe(text);
      const printed = (mock.api.output.print as any).mock.calls.map(([b]: [any]) => b?.text ?? String(b));
      expect(printed.some((t: string) => t.includes('P R O W A D Z I S Z !'))).toBe(true);

      destroyTeam(mock.api);
    });

    it('rewrites a handover between two other people', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael', 'Soroko']);
      setupTeam(mock.api);

      const line = runLine(mock, 'Vindael przekazuje prowadzenie druzyny Soroko.');
      expect(line!.text).toContain('PRZEKAZAL DRUZYNE');
      expect(line!.text).toContain('Vindael');
      expect(line!.text).toContain('Soroko');

      destroyTeam(mock.api);
    });

    it('prpr <n> passes leadership using the slot celownik, prpr <name> as typed', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael', 'Soroko']);
      setupTeam(mock.api);

      const prpr = mock.aliases.find((a) => a.pattern.test('prpr 2'))!;
      prpr.callback(['prpr 2', '2'] as unknown as RegExpMatchArray);
      expect(sentCommands(mock)).toContain('przekaz prowadzenie soroko'); // C form of slot 2
      expect(sentCommands(mock)).toContain('druzyna');

      // Out-of-range and non-numeric args fall back to the literal argument.
      prpr.callback(['prpr 9', '9'] as unknown as RegExpMatchArray);
      expect(sentCommands(mock)).toContain('przekaz prowadzenie 9');
      prpr.callback(['prpr Obcemu', 'Obcemu'] as unknown as RegExpMatchArray);
      expect(sentCommands(mock)).toContain('przekaz prowadzenie obcemu');

      destroyTeam(mock.api);
    });
  });

  describe('team loss alerts (sound only — the client owns the tracking)', () => {
    it('plays basso when you lose someone behind you', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);

      const text = 'Gubisz gdzies za soba Vindaela.';
      expect(runLine(mock, text)!.text).toBe(text); // line untouched
      expect(sentCommands(mock)).toContain('play_basso');

      destroyTeam(mock.api);
    });

    it('plays basso when a teammate disconnects, but not when they stay', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);

      runLine(mock, 'Vindael traci kontakt z rzeczywistoscia.');
      expect(sentCommands(mock).filter((c) => c === 'play_basso')).toHaveLength(1);

      // Still in game — nothing to alert about.
      runLine(mock, 'Vindael traci kontakt z rzeczywistoscia. Mimo to, nie opuszcza swiata Arkadii.');
      // Not on our team — someone else's problem.
      runLine(mock, 'Obcy traci kontakt z rzeczywistoscia.');
      expect(sentCommands(mock).filter((c) => c === 'play_basso')).toHaveLength(1);

      destroyTeam(mock.api);
    });
  });

  describe('coloring (kol_druzyna)', () => {
    it('colors every case form of a team member, with word boundaries', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);

      for (const form of ['Vindael', 'Vindaela', 'Vindaelowi', 'Vindaelem']) {
        const line = runLine(mock, `Tu stoi ${form} z mieczem.`);
        expect(line!.color).toHaveBeenCalledWith([8, 8 + form.length], expect.anything());
      }

      destroyTeam(mock.api);
    });

    it('does not color a substring that is not a whole word', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);

      // "Vindaelowo" contains "Vindael" but is a different word.
      const line = runLine(mock, 'Idzie Vindaelowo gdzies.');
      expect(line!.color).not.toHaveBeenCalled();

      destroyTeam(mock.api);
    });

    it('colors team names inside rewritten banners', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);

      const line = runLine(mock, 'Goblin zrecznie zaslania orka przed ciosami Vindaela.');
      expect(line!.text).toContain('PRZED DRUZYNA');
      const nameStart = line!.text.indexOf('Vindaela');
      expect(nameStart).toBeGreaterThan(-1);
      expect(line!.color).toHaveBeenCalledWith([nameStart, nameStart + 'Vindaela'.length], expect.anything());

      destroyTeam(mock.api);
    });

    it('is rebuilt when the team changes', () => {
      const mock = createMockApi();
      (mock.api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(mock.api);
      expect(mock.tokenTriggers.some((t) => t.token === 'Vindael')).toBe(true);

      (mock.api.team.getMembers as any).mockReturnValue(['Soroko']);
      mock.api.events.emit('teamChange');
      expect(mock.tokenTriggers.some((t) => t.token === 'Vindael')).toBe(false);
      expect(mock.tokenTriggers.some((t) => t.token === 'Soroko')).toBe(true);

      destroyTeam(mock.api);
    });
  });

  it('detaches the listener, removes aliases/triggers, and clears the bind on destroy', () => {
    const mock = createMockApi();
    (mock.api.team.getMembers as any).mockReturnValue(['Nieznany']);
    setupTeam(mock.api);
    expect(mock.tokenTriggers.length).toBeGreaterThan(0);

    destroyTeam(mock.api);

    expect(mock.eventListeners.get('teamChange') ?? []).toHaveLength(0);
    expect(mock.api.aliases.remove).toHaveBeenCalled();
    expect(mock.api.bind.clear).toHaveBeenCalled();
    expect(mock.tokenTriggers).toHaveLength(0);
    expect(mock.triggers).toHaveLength(0);
    expect(getCurrentTeam()).toEqual([]);
    expect(getMissingNames()).toEqual([]);
  });
});
