import { describe, expect, it } from 'vitest';
import { setupLocationCommands } from '../../../src/plugins/core-plugin/location_commands';
import { createMockApi } from '../../helpers/mockApi';

describe('location commands', () => {
  it('sends /roza 1 after entering room 13774', () => {
    const mock = createMockApi();
    const cleanup = setupLocationCommands(mock.api);

    mock.api.events.emit('enterLocation', { id: 13774, room: {}, direction: null });

    expect(mock.api.command.send).toHaveBeenCalledWith('/roza 1');

    cleanup();
    expect(mock.api.events.off).toHaveBeenCalledWith('enterLocation', expect.any(Function));
  });

  it('sends /roza 0 after entering room 20812', () => {
    const mock = createMockApi();
    setupLocationCommands(mock.api);

    mock.api.events.emit('enterLocation', { id: 20812, room: {}, direction: null });

    expect(mock.api.command.send).toHaveBeenCalledWith('/roza 0');
  });

  it('does nothing in other rooms', () => {
    const mock = createMockApi();
    setupLocationCommands(mock.api);

    mock.api.events.emit('enterLocation', { id: 13775, room: {}, direction: null });

    expect(mock.api.command.send).not.toHaveBeenCalled();
  });
});
