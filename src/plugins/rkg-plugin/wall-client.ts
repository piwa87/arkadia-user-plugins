import { storage } from '../../lib/storage';
import type { BladResponse, StatusLimitu } from '../../shared/rkg-api';

export const WALL = 'https://rkg.piwa87.workers.dev';

const KL_GLOSUJACY = 'rkg:glosujacy';
const TIMEOUT_MS = 8000;

export type WallResponse<T> =
  | { ok: true; dane: T }
  | { ok: false; blad: string; limit?: StatusLimitu; requestId?: string };

export interface WallClient {
  voterId(): string;
  request<T>(path: string, init?: RequestInit): Promise<WallResponse<T>>;
  stop(): void;
}

/** Transport and anonymous installation identity shared by publishing and votes. */
export function createWallClient(): WallClient {
  const active = new Set<AbortController>();

  function voterId(): string {
    let id = storage.get<string>(KL_GLOSUJACY);
    if (!id) {
      id = crypto.randomUUID();
      storage.set(KL_GLOSUJACY, id);
    }
    return id;
  }

  async function request<T>(path: string, init?: RequestInit): Promise<WallResponse<T>> {
    const ctrl = new AbortController();
    active.add(ctrl);
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(WALL + path, { ...init, signal: ctrl.signal });
      const data = await res.json().catch(() => null) as Partial<BladResponse> | null;
      if (!res.ok) {
        return {
          ok: false,
          blad: data?.blad || `HTTP ${res.status}`,
          limit: data?.limit,
          requestId: data?.requestId,
        };
      }
      return { ok: true, dane: data as T };
    } catch {
      return { ok: false, blad: 'wall niedostepny' };
    } finally {
      clearTimeout(timer);
      active.delete(ctrl);
    }
  }

  return {
    voterId,
    request,
    stop: () => {
      for (const ctrl of active) ctrl.abort();
      active.clear();
    },
  };
}
