import { describe, expect, it, vi } from 'vitest';
import { createMockApi, MockAnsiAwareBuffer } from '../../helpers/mockApi';
import {
  matchesKnowledgeDomain,
  rankNearestKnowledgeEntries,
  setupNearestKnowledgeAlias,
} from '../../../src/plugins/core-plugin/knowledge/nearest-alias';
import type {
  KnowledgeReportState,
  MissingKnowledgeEntry,
} from '../../../src/plugins/core-plugin/knowledge/report-data';

function entry(id: number, name: string): MissingKnowledgeEntry {
  return {
    character: 'gertruda',
    domain: 'Ishtar',
    category: 'goblinoidach',
    type: 'exploration',
    name,
    id,
    location: `Lokacja ${id}`,
    note: '',
  };
}

describe('nearest knowledge alias', () => {
  it('matches shared domains and the English GMCP name for Imperium', () => {
    expect(matchesKnowledgeDomain('Ishtar/Imperium', 'Ishtar')).toBe(true);
    expect(matchesKnowledgeDomain('Ishtar/Imperium', 'Imperium')).toBe(true);
    expect(matchesKnowledgeDomain('Imperium', 'Empire')).toBe(true);
    expect(matchesKnowledgeDomain('Ishtar', 'Imperium')).toBe(false);
  });

  it('sorts entries by path distance and caches paths for repeated rooms', () => {
    const findPath = vi.fn((_: number, to: number) => {
      if (to === 30) return null;
      return to === 20 ? [1, 2, 20] : [1, 10];
    });

    const result = rankNearestKnowledgeEntries(
      { findPath } as never,
      1,
      [entry(20, 'dalszy'), entry(10, 'blizszy'), entry(20, 'drugi w tym pokoju'), entry(30, 'bez trasy')],
      20,
    );

    expect(result.map(({ id, distance, name }) => ({ id, distance, name }))).toEqual([
      { id: 10, distance: 1, name: 'blizszy' },
      { id: 20, distance: 2, name: 'dalszy' },
      { id: 20, distance: 2, name: 'drugi w tym pokoju' },
    ]);
    expect(findPath).toHaveBeenCalledTimes(3);
  });

  it('prints up to 20 reachable Ishtar entries with names in preview tooltips', async () => {
    vi.useFakeTimers();
    const mock = createMockApi({ room: { id: 1 } });
    mock.api.map.findPath = vi.fn((_: number, to: number) =>
      Array.from({ length: to }, (_, index) => index + 1),
    );
    (mock.api.gmcp.get as ReturnType<typeof vi.fn>).mockReturnValue({
      room: { info: { map: { domain: 'Imperium' } } },
    });
    const reportState: KnowledgeReportState = {
      status: 'ready',
      character: 'gertruda',
      entries: [],
      updatedAt: 1,
    };
    const entries = Array.from({ length: 25 }, (_, index) => ({
      ...entry(index + 2, `wpis ${index + 1}`),
      domain: index === 24 ? 'Ishtar' : index === 23 ? 'Ishtar/Imperium' : 'Imperium',
    }));

    setupNearestKnowledgeAlias(mock.api, () => reportState, () => entries);
    const alias = mock.aliases.find((candidate) => candidate.pattern.test('wiedza20'));
    expect(alias).toBeDefined();
    expect(alias!.callback()).toBe(true);

    expect(mock.api.output.print).toHaveBeenCalledTimes(23);
    expect(mock.api.output.print).toHaveBeenNthCalledWith(
      1,
      '[Wiedza] 20 najblizszych brakujacych wpisow — Imperium (z #1):',
    );
    const printed = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value);
    const buffers = printed.filter(
      (value): value is MockAnsiAwareBuffer => value instanceof MockAnsiAwareBuffer,
    );
    expect(buffers[0].text).toMatch(/^\+-+\+-+\+-+\+-+\+-+\+-+\+$/);
    expect(buffers[buffers.length - 1].text).toBe(buffers[0].text);

    const firstRow = buffers.find((buffer) => buffer.text.startsWith('| 2 '))!;
    expect(firstRow.text).toMatch(/^\| 2\s+\|\s+1 lok\. \| Lokacja 2\s+\| wpis 1\s+\|\s+\| 👁\s*\|$/);
    const eye = firstRow.segments.find((segment) => segment.text === '👁')!;
    expect(eye.state?.hyperlink?.title).toBe('Podglad przez 2 sekundy: wpis 1 (2)');
    firstRow.klik('2');
    expect(mock.api.command.send).toHaveBeenCalledWith('/prowadz 2');
    firstRow.klik('👁');
    expect(mock.api.command.send).toHaveBeenCalledWith('/ustaw 2');
    await vi.advanceTimersByTimeAsync(1999);
    expect(mock.api.command.send).not.toHaveBeenCalledWith('/ustaw 1');
    await vi.advanceTimersByTimeAsync(1);
    expect(mock.api.command.send).toHaveBeenCalledWith('/ustaw 1');
  });

  it('wraps long locations, entry names and notes into multiline rows', () => {
    const mock = createMockApi({ room: { id: 1 } });
    mock.api.map.findPath = vi.fn(() => [1, 2]);
    (mock.api.gmcp.get as ReturnType<typeof vi.fn>).mockReturnValue({
      room: { info: { map: { domain: 'Ishtar' } } },
    });
    const longEntry = {
      ...entry(2, 'Bardzo dlugi brakujacy wpis wiedzy ktory nie miesci sie w jednej linii tabeli'),
      location: 'Bardzo dluga nazwa lokacji ktora powinna zostac zawinieta do kolejnej linii',
      note: 'bardzo dluga notatka z dodatkowa wskazowka dla gracza',
    };

    setupNearestKnowledgeAlias(
      mock.api,
      () => ({ status: 'ready', character: 'gertruda', entries: [], updatedAt: 1 }),
      () => [longEntry],
    );
    mock.aliases.find((candidate) => candidate.pattern.test('wiedza20'))!.callback();

    const rows = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .filter((value): value is MockAnsiAwareBuffer => (
        value instanceof MockAnsiAwareBuffer && value.text.startsWith('| ')
      ));
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.map((row) => row.text).join(' ')).toContain('Bardzo dlugi brakujacy');
    expect(rows[1].text).toMatch(/^\|\s+\|\s+\|/);
    expect(rows[1].text).not.toContain('👁');
  });

  it('restores the original map room when cleaned up during a preview', () => {
    vi.useFakeTimers();
    const mock = createMockApi({ room: { id: 1 } });
    mock.api.map.findPath = vi.fn(() => [1, 2]);
    (mock.api.gmcp.get as ReturnType<typeof vi.fn>).mockReturnValue({
      room: { info: { map: { domain: 'Ishtar' } } },
    });
    const cleanup = setupNearestKnowledgeAlias(
      mock.api,
      () => ({ status: 'ready', character: 'gertruda', entries: [], updatedAt: 1 }),
      () => [entry(2, 'wpis')],
    );

    mock.aliases.find((candidate) => candidate.pattern.test('wiedza20'))!.callback();
    const row = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .find((value): value is MockAnsiAwareBuffer => (
        value instanceof MockAnsiAwareBuffer && value.text.startsWith('| 2 ')
      ))!;
    row.klik('👁');
    cleanup();

    expect(mock.api.command.send).toHaveBeenLastCalledWith('/ustaw 1');
  });

  it('reports when knowledge data is still loading', () => {
    const mock = createMockApi({ room: { id: 1 } });
    setupNearestKnowledgeAlias(
      mock.api,
      () => ({ status: 'loading', entries: [] }),
      () => [],
    );

    const alias = mock.aliases.find((candidate) => candidate.pattern.test('wiedza20'))!;
    alias.callback();
    expect(mock.api.output.print).toHaveBeenCalledWith(
      '[Wiedza] Dane raportu sa jeszcze ladowane. Sprobuj ponownie za chwile.',
    );
  });

  it('remembers the last GMCP domain when the next room does not provide one', () => {
    const mock = createMockApi({ room: { id: 1 } });
    mock.api.map.findPath = vi.fn(() => [1, 2]);
    const gmcpGet = mock.api.gmcp.get as ReturnType<typeof vi.fn>;
    gmcpGet.mockReturnValueOnce({ room: { info: { map: { domain: 'Ishtar' } } } });
    gmcpGet.mockReturnValueOnce({ room: { info: { map: {} } } });
    setupNearestKnowledgeAlias(
      mock.api,
      () => ({ status: 'ready', character: 'gertruda', entries: [], updatedAt: 1 }),
      () => [entry(2, 'wpis')],
    );
    const alias = mock.aliases.find((candidate) => candidate.pattern.test('wiedza20'))!;

    alias.callback();
    alias.callback();

    const headings = vi.mocked(mock.api.output.print).mock.calls
      .map(([value]) => value)
      .filter((value): value is string => typeof value === 'string' && value.startsWith('[Wiedza] 1 '));
    expect(headings).toHaveLength(2);
    expect(headings.every((heading) => heading.includes('— Ishtar '))).toBe(true);
    expect(mock.api.output.print).not.toHaveBeenCalledWith(
      '[Wiedza] Aktualna domena nie jest dostepna w GMCP.',
    );
  });
});
