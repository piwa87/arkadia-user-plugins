import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMapPreviewController } from '../../src/lib/mapPreview';
import { createMockApi } from '../helpers/mockApi';

afterEach(() => vi.useRealTimers());

describe('mapPreview', () => {
  it('previews another room and restores the origin after the timeout', async () => {
    vi.useFakeTimers();
    const mock = createMockApi({ room: { id: 10 } });
    const preview = createMapPreviewController(mock.api, {
      durationMs: 100,
      missingRoomMessage: 'missing',
    });

    preview.preview(20);
    expect(mock.api.command.send).toHaveBeenCalledWith('/ustaw 20');
    await vi.advanceTimersByTimeAsync(100);
    expect(mock.api.command.send).toHaveBeenCalledWith('/ustaw 10');
  });

  it('restores the origin when disposed during a preview', () => {
    vi.useFakeTimers();
    const mock = createMockApi({ room: { id: 10 } });
    const preview = createMapPreviewController(mock.api, { missingRoomMessage: 'missing' });
    preview.preview(20);
    preview.dispose();
    expect(mock.api.command.send).toHaveBeenLastCalledWith('/ustaw 10');
  });
});
