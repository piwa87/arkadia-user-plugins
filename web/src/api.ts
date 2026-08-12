import type {
  AkcjaModeracji,
  BladResponse,
  GlosResponse,
  ListaModeracjiResponse,
  ListaResponse,
  ModeracjaResponse,
  PowodRaportu,
  RaportResponse,
  Sortowanie,
} from '../../src/shared/rkg-api';

export type PageFetch = typeof fetch;

export class ApiError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;
  readonly requestId?: string;

  constructor(status: number, body: BladResponse | null) {
    super(body?.blad || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterMs = body?.ponownieZaMs ?? body?.limit?.ponownieZaMs;
    this.requestId = body?.requestId;
  }
}

function errorBody(value: unknown): BladResponse | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (typeof body.blad !== 'string') return null;
  const rawLimit = body.limit;
  const limit = rawLimit && typeof rawLimit === 'object'
    && typeof (rawLimit as Record<string, unknown>).dostepny === 'boolean'
    && typeof (rawLimit as Record<string, unknown>).ponownieZaMs === 'number'
    ? {
      dostepny: (rawLimit as Record<string, unknown>).dostepny as boolean,
      ponownieZaMs: (rawLimit as Record<string, unknown>).ponownieZaMs as number,
    }
    : undefined;
  return {
    blad: body.blad,
    ponownieZaMs: typeof body.ponownieZaMs === 'number' ? body.ponownieZaMs : undefined,
    requestId: typeof body.requestId === 'string' ? body.requestId : undefined,
    limit,
  };
}

async function jsonResponse<T>(request: Promise<Response>): Promise<T> {
  const response = await request;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, errorBody(body));
  return body as T;
}

function retryText(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} godz.` : `${hours} godz. ${rest} min`;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 429) {
    return error.retryAfterMs
      ? `Limit został wykorzystany. Spróbuj ponownie za ${retryText(error.retryAfterMs)}.`
      : 'Limit został wykorzystany. Spróbuj ponownie później.';
  }
  if (error.status === 403) return 'Hasło nie pasuje albo moderacja jest wyłączona.';
  if (error.status === 404) return 'Ten klub nie jest już dostępny.';
  if (error.status >= 500) {
    return error.requestId ? `${fallback} Kod błędu: ${error.requestId}.` : fallback;
  }
  return error.message.startsWith('HTTP ') ? fallback : error.message;
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
