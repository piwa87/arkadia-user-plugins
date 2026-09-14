import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApi } from '../../helpers/mockApi';
import {
  buildMissingKnowledgeEntries,
  getKnowledgeReportState,
  setupKnowledgeReportData,
} from '../../../src/plugins/core-plugin/knowledge/report-data';

const payload = {
  categories: [
    {
      name: 'goblinoidach',
      types: {
        exploration: {
          entries: [
            { name: 'Widzialas lodowego trolla', status: 'missing' as const, id: 19517 },
            { name: 'Widzialas poznanego goblina', status: 'known' as const, id: 100 },
            { name: 'Widzialas wpis bez lokacji', status: 'missing' as const, id: null },
          ],
        },
      },
    },
  ],
};

const source = [
  {
    Rodzaj: 'Wiedza o goblinoidach',
    Wiedza: 'Widziales lodowego trolla',
    id: 19517,
    Domena: 'Ishtar',
    lokalizacja: 'Mahakam - Lodowe Trolle',
    note: 'ob trolla',
  },
  {
    Rodzaj: 'Wiedza o goblinoidach',
    Wiedza: 'Widziales poznanego goblina',
    id: 100,
    Domena: 'Ishtar',
  },
];

describe('knowledge report data', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('joins missing report entries with hosted knowledge data', () => {
    expect(buildMissingKnowledgeEntries(payload, source, 'gertruda')).toEqual([
      {
        character: 'gertruda',
        domain: 'Ishtar',
        category: 'goblinoidach',
        type: 'exploration',
        name: 'Widziales lodowego trolla',
        id: 19517,
        location: 'Mahakam - Lodowe Trolle',
        note: 'ob trolla',
      },
    ]);
  });

  it('loads hosted data, requests a client report and removes its listeners', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => source,
    })));
    const mock = createMockApi();
    (mock.api.gmcp.get as ReturnType<typeof vi.fn>).mockReturnValue({
      char: { info: { name: 'Gertruda' } },
    });

    const cleanup = await setupKnowledgeReportData(mock.api);

    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ pathname: expect.stringMatching(/\/data\/knowledge\.json$/) }));
    expect(mock.api.events.emit).toHaveBeenCalledWith('requestKnowledgeDetailsReport');

    mock.api.events.emit('knowledgeDetailsReport', payload);
    expect(getKnowledgeReportState()).toMatchObject({
      status: 'ready',
      character: 'gertruda',
      entries: [{ id: 19517, domain: 'Ishtar' }],
    });

    cleanup();
    expect(mock.eventListeners.get('knowledgeDetailsReport')).toEqual([]);
    expect(mock.eventListeners.get('knowledgeDetailsUpdated')).toEqual([]);
  });
});
