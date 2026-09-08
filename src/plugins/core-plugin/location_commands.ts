import type { PluginApi } from '@arkadia/plugin-types';

/** Commands sent automatically after entering selected map locations. */
const LOCATION_COMMANDS: ReadonlyMap<number, string> = new Map([
  [13774, '/roza 1'],
  [20812, '/roza 0'],
]);

export function setupLocationCommands(api: PluginApi): () => void {
  const onEnterLocation = (event: { id: number }) => {
    const command = LOCATION_COMMANDS.get(event.id);
    if (command) void api.command.send(command);
  };

  api.events.on('enterLocation', onEnterLocation);

  return () => api.events.off('enterLocation', onEnterLocation);
}
