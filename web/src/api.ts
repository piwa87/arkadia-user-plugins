import type {
  AkcjaModeracji,
  GlosResponse,
  ListaModeracjiResponse,
  ListaResponse,
  ModeracjaResponse,
  PowodRaportu,
  RaportResponse,
  Sortowanie,
} from '../../src/shared/rkg-api';

export type PageFetch = typeof fetch;

async function jsonResponse<T>(request: Promise<Response>): Promise<T> {
  const response = await request;
  if (!response.ok) throw new Error(String(response.status));
  return await response.json() as T;
}

export function fetchRanking(
  sort: Sortowanie,
  cursor?: string,
  pageFetch: PageFetch = fetch,
): Promise<ListaResponse> {
  const params = new URLSearchParams({ sort });
  if (cursor) params.set('cursor', cursor);
  return jsonResponse<ListaResponse>(pageFetch(`/api/nazwy?${params}`));
}

export function submitVote(
  id: string,
  glosujacy: string,
  wartosc: 1 | -1 | 0,
  pageFetch: PageFetch = fetch,
): Promise<GlosResponse> {
  return jsonResponse<GlosResponse>(pageFetch(`/api/nazwy/${id}/glos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ glosujacy, wartosc }),
  }));
}

export function submitReport(
  id: string,
  glosujacy: string,
  powod: PowodRaportu,
  pageFetch: PageFetch = fetch,
): Promise<RaportResponse> {
  return jsonResponse<RaportResponse>(pageFetch(`/api/nazwy/${id}/raport`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ glosujacy, powod }),
  }));
}

export function fetchModeration(
  key: string,
  pageFetch: PageFetch = fetch,
): Promise<ListaModeracjiResponse> {
  return jsonResponse<ListaModeracjiResponse>(pageFetch('/api/admin/nazwy', {
    headers: { 'X-RKG-Admin': key },
  }));
}

export function submitModeration(
  id: string,
  akcja: AkcjaModeracji,
  key: string,
  pageFetch: PageFetch = fetch,
): Promise<ModeracjaResponse> {
  return jsonResponse<ModeracjaResponse>(pageFetch(`/api/admin/nazwy/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-RKG-Admin': key },
    body: JSON.stringify({ akcja }),
  }));
}
