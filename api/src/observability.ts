export type OperationalEvent =
  | 'moderation.access_denied'
  | 'moderation.applied'
  | 'report.rate_limited'
  | 'request.failed'
  | 'submission.accepted'
  | 'submission.rate_limited'
  | 'vote.rate_limited';

type EventFields = Record<string, boolean | number | string>;

/**
 * Emit small, structured operational events for Workers Logs. Callers pass
 * only non-sensitive fields: never device identifiers or admin credentials.
 */
export function logEvent(event: OperationalEvent, fields: EventFields = {}): void {
  const line = JSON.stringify({ ...fields, event });
  if (event === 'request.failed') console.error(line);
  else console.log(line);
}
