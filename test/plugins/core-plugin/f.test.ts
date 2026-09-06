import { describe, expect, it } from 'vitest';
import { setupBindAliases } from '../../../src/plugins/core-plugin/f';
import { createMockApi } from '../../helpers/mockApi';

describe('location-specific functional binds', () => {
  it('sets napwsz in room 20892 and clears it after leaving', () => {
    const room = { id: 20892 };
    const mock = createMockApi({ room });
    const cleanup = setupBindAliases(mock.api);

    expect(mock.api.bind.set).toHaveBeenCalledWith('napwsz');

    room.id = 20889;
    mock.api.events.emit('mapMove');
    expect(mock.api.bind.clear).toHaveBeenCalledTimes(1);

    cleanup();
    expect(mock.api.events.off).toHaveBeenCalledWith('mapMove', expect.any(Function));
  });
});
