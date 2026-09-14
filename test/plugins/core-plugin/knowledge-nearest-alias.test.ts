import { describe, expect, it, vi } from 'vitest';
import { createMockApi } from '../../helpers/mockApi';
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

  it('prints up to 20 reachable Ishtar entries', () => {
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

    expect(mock.api.output.print).toHaveBeenCalledTimes(21);
    expect(mock.api.output.print).toHaveBeenNthCalledWith(
      1,
      '[Wiedza] 20 najblizszych brakujacych wpisow — Imperium (z #1):',
    );
    expect(mock.api.output.print).toHaveBeenNthCalledWith(
      2,
      '1. [1] #2 | Lokacja 2 | wpis 1',
    );
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
});
