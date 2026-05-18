import type { PluginApi } from '@arkadia/plugin-types';

export function setupTravelAliases(
  api: PluginApi,
  armArrivalTrigger: (label: string, callback: () => void) => void,
): void {
  const registerSendAlias = (pattern: RegExp, label: string, command: string) => {
    api.aliases.register(pattern, () => {
      armArrivalTrigger(label, () => {
        api.command.send(command);
      });
      return true;
    });
  };

  // #region ned+
  registerSendAlias(/^ned\+$/, 'ned+', 'ned');

  // #region op+
  registerSendAlias(/^op\+$/, 'op+', 'op');

  // #region op++
  api.aliases.register(/^op\+\+$/, () => {
    armArrivalTrigger('op++', () => {
      api.command.send('op');
      api.command.send('ned');
    });
    return true;
  });

  // #region test-arrival
  api.aliases.register(/^test-arrival$/, () => {
    api.command.send('/fake --> Statek z wolna doplywa do brzegu.');
    return true;
  });

  // #region wned+
  registerSendAlias(/^wned\+$/, 'wned+', 'wned');

  // #region wop+
  registerSendAlias(/^wop\+$/, 'wop+', 'wop');
}
