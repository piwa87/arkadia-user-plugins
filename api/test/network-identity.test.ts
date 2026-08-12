import { describe, expect, it } from 'vitest';
import { networkIdentity } from '../src/network-identity';

const SECRET = 'test-only-network-secret-with-32-bytes';

function request(ip?: string): Request {
  return new Request('https://rkg.test/api/nazwy', {
    headers: ip ? { 'CF-Connecting-IP': ip } : undefined,
  });
}

describe('network identity', () => {
  it('is deterministic, keyed and contains no raw address', async () => {
    const first = await networkIdentity(request('198.51.100.70'), SECRET);
    const second = await networkIdentity(request('198.51.100.70'), SECRET);
    const other = await networkIdentity(request('198.51.100.71'), SECRET);

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain('198.51.100.70');
    expect(other).not.toBe(first);
  });

  it('fails closed without a strong secret or a Cloudflare client address', async () => {
    await expect(networkIdentity(request('198.51.100.70'), 'too-short')).rejects.toThrow(
      'RKG_LIMIT_SECRET',
    );
    await expect(networkIdentity(request(), SECRET)).rejects.toThrow('network identity');
  });

  it('treats rotating IPv6 addresses inside one /64 as the same network', async () => {
    const first = await networkIdentity(request('2001:db8:1234:5678::1'), SECRET);
    const rotated = await networkIdentity(request('2001:0db8:1234:5678:abcd::99'), SECRET);
    const otherNetwork = await networkIdentity(request('2001:db8:1234:5679::1'), SECRET);

    expect(rotated).toBe(first);
    expect(otherNetwork).not.toBe(first);
  });
});
