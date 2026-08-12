const MIN_SECRET_BYTES = 32;
const MAX_IP_LENGTH = 64;
const DOMAIN = 'rkg-network-v1\0';

function toHex(value: ArrayBuffer): string {
  return [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Keep IPv6 privacy-address rotation inside the same household /64. */
function normalizeNetwork(ip: string): string {
  if (!ip.includes(':') || ip.includes('.')) return ip;
  const halves = ip.toLowerCase().split('::');
  if (halves.length > 2) return ip;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return ip;
  const parts = [...left, ...Array(missing).fill('0'), ...right];
  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return ip;
  return `${parts.slice(0, 4).map((part) => Number.parseInt(part, 16).toString(16)).join(':')}::/64`;
}

/**
 * Derive a short-lived, server-only network identity without persisting the
 * visitor's raw IP address. A keyed HMAC prevents offline enumeration of the
 * small IPv4 address space if the D1 data is ever exposed.
 */
export async function networkIdentity(
  request: Request,
  secret: string | undefined,
): Promise<string> {
  const encoder = new TextEncoder();
  if (!secret || encoder.encode(secret).byteLength < MIN_SECRET_BYTES) {
    throw new Error('RKG_LIMIT_SECRET is missing or too short');
  }

  const ip = request.headers.get('CF-Connecting-IP')?.trim();
  if (!ip || ip.length > MAX_IP_LENGTH) throw new Error('client network identity is unavailable');

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(DOMAIN + normalizeNetwork(ip)),
  );
  return toHex(signature);
}
