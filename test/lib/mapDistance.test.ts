import { describe, expect, it, vi } from 'vitest';
import { createRoomDistanceLookup, getRoomDistance } from '../../src/lib/mapDistance';

describe('mapDistance', () => {
  it('returns zero for the current room without asking for a path', () => {
    const findPath = vi.fn();
    expect(getRoomDistance({ findPath } as never, 10, 10)).toBe(0);
    expect(findPath).not.toHaveBeenCalled();
  });

  it('returns null when a path is unavailable or pathfinding throws', () => {
    expect(getRoomDistance({ findPath: () => null } as never, 1, 2)).toBeNull();
    expect(getRoomDistance({ findPath: () => { throw new Error('bad map'); } } as never, 1, 2)).toBeNull();
  });

  it('caches distances by destination room', () => {
    const findPath = vi.fn(() => [1, 2, 3]);
    const distance = createRoomDistanceLookup({ findPath } as never, 1);
    expect(distance(3)).toBe(2);
    expect(distance(3)).toBe(2);
    expect(findPath).toHaveBeenCalledTimes(1);
  });
});
