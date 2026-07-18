import { describe, expect, it } from 'vitest';
import { createMockApi, runLine } from '../../../helpers/mockApi';
import {
  setupTeam,
  destroyTeam,
  getCurrentTeam,
  getCurrentLeader,
  getMissingNames,
} from '../../../../src/plugins/development-plugin/mod_team/team';

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

    // Warning printed and the functional bind armed to fire wylap.
    expect(api.output.print).toHaveBeenCalled();
    expect(api.bind.set).toHaveBeenCalledWith(null, expect.any(Function));

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

  it('the wylap alias fires the stub with the missing names', () => {
    const { api, aliases } = createMockApi();
    (api.team.getMembers as any).mockReturnValue(['Nieznany']);
    setupTeam(api);

    const wylap = aliases.find((a) => a.pattern.test('wylap'));
    expect(wylap).toBeDefined();
    (api.output.print as any).mockClear();
    wylap!.callback();
    expect(api.output.print).toHaveBeenCalled();

    destroyTeam(api);
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
