import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupDylizansy } from '../../../src/plugins/core-plugin/movement/dylizansy';
import { createMockApi, runLine } from '../../helpers/mockApi';

afterEach(() => vi.unstubAllGlobals());

describe('dylizansy', () => {
  it('notifies with the announced stop and leaves the game line visible', () => {
    const notification = vi.fn();
    vi.stubGlobal('Notification', Object.assign(notification, { permission: 'granted' }));
    const mock = createMockApi();
    setupDylizansy(mock.api);

    const announcement = 'Z zewnatrz slyszysz glos woznicy: Fermata - Ebino!';
    expect(runLine(mock, announcement)?.text).toBe(announcement);
    expect(notification).toHaveBeenCalledExactlyOnceWith('🚏 Przystanek: Fermata - Ebino!');

    runLine(mock, 'Z zewnatrz slyszysz glos woznicy: Przystanek - zielona morda');
    expect(notification).toHaveBeenLastCalledWith('🚏 Przystanek: Przystanek - zielona morda');

    runLine(mock, 'Z zewnatrz slyszysz glos woznicy.');
    expect(notification).toHaveBeenCalledTimes(2);
  });
});
