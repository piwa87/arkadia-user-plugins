import { describe, expect, it } from 'vitest';
import { findMatchRange } from '../src/lib/findMatchRange';

describe('findMatchRange', () => {
  it('returns a range for the first match', () => {
    expect(findMatchRange('alarm ahead', 'alarm')).toEqual([0, 5]);
  });

  it('returns null when the match is missing', () => {
    expect(findMatchRange('alarm ahead', 'safe')).toBeNull();
  });
});
