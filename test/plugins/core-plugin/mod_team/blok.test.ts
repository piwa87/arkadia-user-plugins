import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApi, runLine, type MockApi } from '../../../helpers/mockApi';
import { setupTeam, destroyTeam } from '../../../../src/plugins/core-plugin/mod_team/team';

function sentCommands(mock: MockApi): string[] {
  return (mock.api.command.send as any).mock.calls.map(([cmd]: [string]) => cmd);
}

/** Everything the module printed, as plain text. */
function printedText(mock: MockApi): string[] {
  return (mock.api.output.print as any).mock.calls.map(([arg]: [any]) =>
    typeof arg === 'string' ? arg : (arg?.text ?? ''),
  );
}

/** The blok footer widget handle. */
function blokFooter(mock: MockApi) {
  const entry = mock.footerComponents.find((c) => c.id === 'blok');
  if (!entry) throw new Error('brak komponentu blok w stopce');
  return entry.handle;
}

/** Last HTML pushed into the footer. */
function footerContent(mock: MockApi): string {
  const calls = (blokFooter(mock).setContent as any).mock.calls;
  return calls.length > 0 ? calls[calls.length - 1][0] : '';
}

/** Whether the footer is currently shown. */
function footerVisible(mock: MockApi): boolean {
  const calls = (blokFooter(mock).setVisible as any).mock.calls;
  return calls.length > 0 ? calls[calls.length - 1][0] : false;
}

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

function teamOf(mock: MockApi, members: string[]): void {
  (mock.api.team.getMembers as any).mockReturnValue(members);
}

describe('mod_team — blok drogi ucieczki', () => {
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

  describe('someone starts blocking us', () => {
    it('alarms, plays the alarm sound and counts 5 s down in the log and the footer', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      setupTeam(mock.api);

      const line = runLine(mock, 'Terenes przymierza sie do odciecia ci drogi ucieczki.');

      expect(line!.text).toContain('BLOK BLOK BLOK');
      expect(line!.text).toContain('Terenes');
      expect(line!.text).toContain('CIEBIE!');
      expect(sentCommands(mock)).toContain('play_alarm');

      // 5 is printed immediately, then one line per second down to 1.
      expect(printedText(mock)).toContain('[ blok 5 sek ]');
      expect(footerContent(mock)).toContain('BLOK 5');
      expect(footerVisible(mock)).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(printedText(mock)).toContain('[ blok 4 sek ]');
      expect(footerContent(mock)).toContain('BLOK 4');

      vi.advanceTimersByTime(3000);
      expect(printedText(mock)).toContain('[ blok 1 sek ]');

      // After the fifth second it stops and hides — no "[ blok 0 sek ]".
      vi.advanceTimersByTime(1000);
      expect(printedText(mock)).not.toContain('[ blok 0 sek ]');
      expect(footerVisible(mock)).toBe(false);

      destroyTeam(mock.api);
    });

    it('stops the countdown when the block lands', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      setupTeam(mock.api);

      runLine(mock, 'Terenes przymierza sie do odciecia ci drogi ucieczki.');
      vi.advanceTimersByTime(1000);

      const line = runLine(mock, 'Terenes zajmuje pozycje umozliwiajaca odciecie ci drogi ucieczki.');
      expect(line!.text).toContain('Dales sie zablokowac');
      expect(footerVisible(mock)).toBe(false);

      vi.advanceTimersByTime(3000);
      expect(printedText(mock)).not.toContain('[ blok 2 sek ]');

      destroyTeam(mock.api);
    });

    it('stops the countdown when we leave the room', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      setupTeam(mock.api);

      runLine(mock, 'Terenes przymierza sie do odciecia ci drogi ucieczki.');
      mock.api.events.emit('mapMove');

      expect(footerVisible(mock)).toBe(false);
      vi.advanceTimersByTime(3000);
      expect(printedText(mock)).not.toContain('[ blok 4 sek ]');

      destroyTeam(mock.api);
    });

    it('stops the countdown on the give-up lines', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      setupTeam(mock.api);

      runLine(mock, 'Przymierzasz sie do odciecia Huggusowi drogi ucieczki.');
      const line = runLine(mock, 'Przerywasz przygotowania do odciecia drogi ucieczki Huggusowi.');
      expect(line!.text).toContain('upsik');
      expect(footerVisible(mock)).toBe(false);

      runLine(mock, 'Przymierzasz sie do odciecia Huggusowi drogi ucieczki.');
      expect(footerVisible(mock)).toBe(true);
      runLine(mock, 'Twoj przeciwnik, ktorego chciales blokowac zniknal.');
      expect(footerVisible(mock)).toBe(false);

      destroyTeam(mock.api);
    });
  });

  describe('teammates', () => {
    it('alarms when a teammate is being blocked (celownik)', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      // Vindael's celownik is "Vindaelowi".
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);

      const line = runLine(mock, 'Vorid przymierza sie do odciecia Vindaelowi drogi ucieczki.');

      expect(line!.text).toContain('BLOKUJA CI DRUZYNE');
      expect(line!.text).toContain('Vorid');
      expect(sentCommands(mock)).toContain('play_alarm');
      expect(footerContent(mock)).toContain('BLOK 5');

      destroyTeam(mock.api);
    });

    it('reports a teammate setting up a block without alarming', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);

      const line = runLine(mock, 'Vindael przymierza sie do odciecia Huggusowi drogi ucieczki.');

      expect(line!.text).toContain('DRUZYNA BEDZIE BLOKOWALA');
      expect(sentCommands(mock)).not.toContain('play_alarm');
      expect(footerVisible(mock)).toBe(false);

      destroyTeam(mock.api);
    });

    it('does not alarm when a teammate blocks another teammate', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      teamOf(mock, ['Vindael', 'Hardin']);
      setupTeam(mock.api);

      const line = runLine(mock, 'Vindael przymierza sie do odciecia Hardinowi drogi ucieczki.');

      expect(line!.text).toContain('DRUZYNA BEDZIE BLOKOWALA');
      expect(line!.text).not.toContain('BLOKUJA CI DRUZYNE');
      expect(sentCommands(mock)).not.toContain('play_alarm');

      destroyTeam(mock.api);
    });

    it('marks a landed teammate block and a blocked teammate', () => {
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);

      expect(
        runLine(mock, 'Vindael zajmuje pozycje umozliwiajaca odciecie Huggusowi drogi ucieczki.')!
          .text,
      ).toContain('DRUZYNA ZABLOKOWALA');

      const blocked = runLine(mock, 'Potworny troll blokuje Vindaelowi droge ucieczki na polnoc.');
      expect(blocked!.text).toContain('druzyna zablokowana');
      expect(blocked!.text).toContain('Potworny troll blokuje'); // original line kept
      expect(sentCommands(mock)).toContain('play_basso');

      destroyTeam(mock.api);
    });

    it('leaves lines about strangers alone', () => {
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);

      const text = 'Vorid przymierza sie do odciecia Huggusowi drogi ucieczki.';
      expect(runLine(mock, text)!.text).toBe(text);
      expect(sentCommands(mock)).not.toContain('play_alarm');

      destroyTeam(mock.api);
    });
  });

  describe('our own blocks', () => {
    it('counts down our own block attempt in green', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      setupTeam(mock.api);

      const line = runLine(mock, 'Przymierzasz sie do odciecia Huggusowi drogi ucieczki.');

      expect(line!.text).toContain('BEDZIESZ BLOKOWAL');
      expect(footerContent(mock)).toContain('BLOK&gt; 5');
      expect(sentCommands(mock)).not.toContain('play_alarm');

      const landed = runLine(mock, 'Zajmujesz pozycje umozliwiajaca odciecie Huggusowi drogi ucieczki.');
      expect(landed!.text).toContain('ZABLOKOWALES');
      expect(footerVisible(mock)).toBe(false);

      destroyTeam(mock.api);
    });

    it('marks holding someone in place and being walked around', () => {
      const mock = createMockApi();
      setupTeam(mock.api);

      expect(runLine(mock, 'Blokujesz Huggusowi droge na zachod.')!.text).toContain(
        'blokujesz droge, muhahaha',
      );
      expect(runLine(mock, 'Huggus omija twoj nieskuteczny blok.')!.text).toContain('upsik');

      destroyTeam(mock.api);
    });
  });

  it('warns and plays basso when we are already blocked in a direction', () => {
    const mock = createMockApi();
    setupTeam(mock.api);

    const line = runLine(mock, 'Mezny gwardzista blokuje ci droge ucieczki na poludnie.');

    expect(line!.text).toContain('ktos cie przyblokowal');
    expect(line!.text).toContain('Mezny gwardzista blokuje ci droge'); // original kept
    expect(sentCommands(mock)).toContain('play_basso');

    destroyTeam(mock.api);
  });

  it('bp sends zablokuj przeciwnika', () => {
    const mock = createMockApi();
    setupTeam(mock.api);

    runAlias(mock, 'bp');
    expect(sentCommands(mock)).toContain('zablokuj przeciwnika');

    destroyTeam(mock.api);
  });

  describe('bloktest!', () => {
    it('replays every sample line without touching the game or starting a timer', () => {
      vi.useFakeTimers();
      const mock = createMockApi();
      teamOf(mock, ['Vindael']);
      setupTeam(mock.api);
      (mock.api.command.send as any).mockClear();

      runAlias(mock, 'bloktest!');
      const out = printedText(mock).join('\n');

      expect(out).toContain('BLOK BLOK BLOK');
      expect(out).toContain('Dales sie zablokowac');
      expect(out).toContain('BLOKUJA CI DRUZYNE');
      expect(out).toContain('Zablokowali ci druzyne');
      expect(out).toContain('DRUZYNA BEDZIE BLOKOWALA');
      expect(out).toContain('DRUZYNA ZABLOKOWALA');
      expect(out).toContain('BEDZIESZ BLOKOWAL');
      expect(out).toContain('ZABLOKOWALES');
      expect(out).toContain('ktos cie przyblokowal');
      expect(out).toContain('druzyna zablokowana');
      expect(out).toContain('zablokowany, muhahaha');
      expect(out).toContain('upsik');

      // Side effects are described, not executed — and no countdown is running.
      expect(out).toContain('[test] play_alarm');
      expect(out).toContain('[test] blok_alarm');
      expect(sentCommands(mock)).toEqual([]);
      expect(footerVisible(mock)).toBe(false);

      vi.advanceTimersByTime(5000);
      expect(printedText(mock)).not.toContain('[ blok 4 sek ]');

      destroyTeam(mock.api);
    });
  });
});
