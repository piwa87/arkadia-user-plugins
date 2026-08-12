import { describe, expect, it, vi } from 'vitest';
import type { PageFetch } from '../../web/src/api';
import {
  fetchModeration,
  fetchRanking,
  submitModeration,
  submitReport,
  submitVote,
} from '../../web/src/api';

function respondingWith(body: unknown) {
  const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
  const pageFetch: PageFetch = async (input, init) => {
    calls.push([input, init]);
    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { calls, pageFetch };
}

describe('RKG browser API', () => {
  it('builds ranking pagination without leaking it into the UI controller', async () => {
    const mock = respondingWith({ pozycje: [], cursor: '50' });

    await fetchRanking('nowe', '25', mock.pageFetch);

    expect(mock.calls[0][0]).toBe('/api/nazwy?sort=nowe&cursor=25');
  });

  it('sends votes and reports with the installation identity', async () => {
    const vote = respondingWith({ id: 'club-0001', wynikGlosow: 3 });
    const report = respondingWith({ id: 'club-0001', przyjete: true, duplikat: false });

    await submitVote('club-0001', 'device-12345678', -1, vote.pageFetch);
    await submitReport('club-0001', 'device-12345678', 'inne', report.pageFetch);

    expect(vote.calls[0]).toEqual([
      '/api/nazwy/club-0001/glos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ glosujacy: 'device-12345678', wartosc: -1 }),
      }),
    ]);
    expect(report.calls[0]).toEqual([
      '/api/nazwy/club-0001/raport',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ glosujacy: 'device-12345678', powod: 'inne' }),
      }),
    ]);
  });

  it('keeps the moderation key in its private request header', async () => {
    const list = respondingWith({ pozycje: [] });
    const action = respondingWith({ id: 'club-0001', akcja: 'ukryj' });

    await fetchModeration('secret-word', list.pageFetch);
    await submitModeration('club-0001', 'ukryj', 'secret-word', action.pageFetch);

    expect(list.calls[0]).toEqual([
      '/api/admin/nazwy',
      { headers: { 'X-RKG-Admin': 'secret-word' } },
    ]);
    expect(action.calls[0][1]).toEqual(expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-RKG-Admin': 'secret-word' },
    }));
  });

  it('rejects unsuccessful responses before controllers update the page', async () => {
    const pageFetch = vi.fn(async () => new Response('{}', { status: 403 })) as PageFetch;

    await expect(fetchModeration('wrong', pageFetch)).rejects.toThrow('403');
  });
});
