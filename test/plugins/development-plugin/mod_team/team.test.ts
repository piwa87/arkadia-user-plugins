import { describe, expect, it, vi } from 'vitest';
import { createMockApi, MockAnsiAwareBuffer } from '../../../helpers/mockApi';
import {
  setupTeam,
  destroyTeam,
  getCurrentTeam,
  getCurrentLeader,
  getMissingNames,
} from '../../../../src/plugins/development-plugin/mod_team/team';

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

  describe('zaslona trigger (zas_przed_team)', () => {
    function getTrigger(triggers: any[]) {
      return triggers.find((t) => t.tag === 'mod_team');
    }

    it('rewrites the line in place when the shielder is a team member (in dopelniacz)', () => {
      const { api, triggers } = createMockApi();
      (api.team.getMembers as any).mockReturnValue(['Vindael']); // D form: "Vindaela"
      setupTeam(api);

      const trig = getTrigger(triggers);
      const text = 'Goblin zrecznie zaslania orka przed ciosami Vindaela.';
      const matches = text.match(trig.pattern)!;
      const line = new MockAnsiAwareBuffer(text);
      const result = trig.callback(line, matches);

      // Mutated in place and returned — not gagged, not via output.print.
      expect(result).toBe(line);
      expect(line.text).toContain('PRZED DRUZYNA');
      expect(line.text).toContain('z a s l a n i a');
      expect(line.text).toContain('Goblin');
      expect(line.text).toContain('orka');
      expect(line.text).toContain('Vindaela');
      expect(api.output.print).not.toHaveBeenCalledWith(line);
      expect(api.command.send).toHaveBeenCalledWith('play_morse');

      destroyTeam(api);
    });

    it('passes the line through unchanged when the shielder is not on the team', () => {
      const { api, triggers } = createMockApi();
      (api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(api);

      const trig = getTrigger(triggers);
      const text = 'Goblin zrecznie zaslania orka przed ciosami Obcego.';
      const matches = text.match(trig.pattern)!;
      const line = new MockAnsiAwareBuffer(text);
      const result = trig.callback(line, matches);

      expect(result).toBe(line); // pass-through
      expect(line.text).toBe(text); // untouched
      expect(api.command.send).not.toHaveBeenCalledWith('play_morse');

      destroyTeam(api);
    });

    it('removes its triggers on destroy', () => {
      const { api, triggers } = createMockApi();
      (api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(api);
      expect(getTrigger(triggers)).toBeDefined();

      destroyTeam(api);
      expect(getTrigger(triggers)).toBeUndefined();
    });
  });

  describe('coloring trigger (kol_druzyna)', () => {
    // The coloring trigger is the mod_team trigger that matches a bare name.
    function getColorTrigger(triggers: any[]) {
      return triggers.find((t) => t.tag === 'mod_team' && t.pattern.test('Vindaela'));
    }

    it('colors every case form of a team member, with word boundaries', () => {
      const { api, triggers } = createMockApi();
      (api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(api);

      const trig = getColorTrigger(triggers);
      expect(trig).toBeDefined();

      // Each declension form gets colored when it appears as a whole word.
      for (const form of ['Vindael', 'Vindaela', 'Vindaelowi', 'Vindaelem']) {
        const line = new MockAnsiAwareBuffer(`Tu stoi ${form} z mieczem.`);
        line.color = vi.fn(() => line) as any;
        trig.callback(line, [form]);
        expect(line.color).toHaveBeenCalledWith(
          [8, 8 + form.length],
          expect.anything(),
        );
      }

      destroyTeam(api);
    });

    it('does not color a substring that is not a whole word', () => {
      const { api, triggers } = createMockApi();
      (api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(api);

      const trig = getColorTrigger(triggers);
      // "Vindaelowo" contains "Vindael" but is a different word.
      const line = new MockAnsiAwareBuffer('Idzie Vindaelowo gdzies.');
      line.color = vi.fn(() => line) as any;
      trig.callback(line, ['x']);
      expect(line.color).not.toHaveBeenCalled();

      destroyTeam(api);
    });

    it('is rebuilt when the team changes', () => {
      const { api, triggers } = createMockApi();
      (api.team.getMembers as any).mockReturnValue(['Vindael']);
      setupTeam(api);
      expect(getColorTrigger(triggers)?.pattern.test('Soroko')).toBe(false);

      (api.team.getMembers as any).mockReturnValue(['Soroko']);
      api.events.emit('teamChange');
      expect(getColorTrigger(triggers)).toBeUndefined(); // old Vindael trigger gone
      const sorokoTrig = triggers.find(
        (t: any) => t.tag === 'mod_team' && t.pattern.test('Soroko'),
      );
      expect(sorokoTrig).toBeDefined();

      destroyTeam(api);
    });
  });

  it('detaches the listener, removes the alias, and clears the bind on destroy', () => {
    const { api, eventListeners } = createMockApi();
    (api.team.getMembers as any).mockReturnValue(['Nieznany']);
    setupTeam(api);

    destroyTeam(api);

    expect(eventListeners.get('teamChange') ?? []).toHaveLength(0);
    expect(api.aliases.remove).toHaveBeenCalled();
    expect(api.bind.clear).toHaveBeenCalled();
    expect(getCurrentTeam()).toEqual([]);
    expect(getMissingNames()).toEqual([]);
  });
});
