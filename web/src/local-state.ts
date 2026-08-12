const VOTER_KEY = 'rkg:glosujacy';
const VOTES_KEY = 'rkg:mojeGlosy';
const REPORTS_KEY = 'rkg:raporty';
const ADMIN_KEY = 'rkg:admin';

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

export function voterId(): string {
  let id = localStorage.getItem(VOTER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VOTER_KEY, id);
  }
  return id;
}

export function ownVotes(): Record<string, number> {
  const value = readJson(VOTES_KEY);
  if (!value || Array.isArray(value) || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] =>
      entry[1] === 1 || entry[1] === -1,
    ),
  );
}

export function rememberVote(id: string, value: number): void {
  const votes = ownVotes();
  if (value === 0) delete votes[id];
  else votes[id] = value;
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
}

export function ownReports(): Set<string> {
  const value = readJson(REPORTS_KEY);
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((entry): entry is string => typeof entry === 'string'));
}

export function rememberReport(id: string): void {
  const ids = ownReports();
  ids.add(id);
  localStorage.setItem(REPORTS_KEY, JSON.stringify([...ids].slice(-200)));
}

export function adminKey(): string {
  return sessionStorage.getItem(ADMIN_KEY) ?? '';
}

export function rememberAdminKey(value: string): void {
  sessionStorage.setItem(ADMIN_KEY, value);
}
