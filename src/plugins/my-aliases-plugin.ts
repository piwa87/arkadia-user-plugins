import type { PluginApi } from '@arkadia/plugin-types';

export async function init(api: PluginApi): Promise<void> {
  let targets = ['INIT', 'cel2', 'cel3', 'cel4'];

  // Register footer component
  const handle = api.ui.registerFooterComponent('targets', `Targets: ${targets.join(' | ')}`);

  // Update targets function
  const updateTargets = () => {
    handle.setContent(`Targets: ${targets.join(' | ')}`);
  };

  // Main set alias - sets all targets
  api.aliases.register(/^set (.+)$/, ([, target]) => {
    targets = [target, target, target, target];
    updateTargets();
    api.command.send(`set ${target}`);
    return true;
  });

  // Individual target setting aliases
  for (let i = 1; i <= 4; i++) {
    api.aliases.register(new RegExp(`^set${i} (.+)$`), ([, target]) => {
      targets[i - 1] = target;
      updateTargets();
      api.command.send(`set${i} ${target}`);
      return true;
    });
  }

  // Arrival trigger for coloring travel messages
  api.triggers.register(
    /^(Statek z wolna doplywa do brzegu\.)$/,
    (line, match) => {
      const matchedText = match?.[1] || match?.[0] || line.text;
      const matchLength = typeof matchedText === 'string' ? matchedText.length : line.text.length;
      line.color([0, matchLength], { type: 'hex', value: '#d97706' });
      return { text: line.text, appliedRange: [0, matchLength] };
    },
    'starterPlugin'
  );

  // Movement macros with delay
  const oneTimeTriggers: any[] = [];

  for (const [macro, command] of [
    ['op+', 'op'],
    ['op++', 'op\nned'],
  ]) {
    api.aliases.register(new RegExp(`^${macro.replace(/\+/g, '\\+')}$`), () => {
      api.output.print(`Temp trigger armed: waiting for arrival (${macro})`);
      const callback = () => {
        setTimeout(() => {
          for (const cmd of command.split('\n')) {
            api.command.send(cmd);
          }
        }, Math.random() * 1000);
      };
      const oneTimeTrigger = {
        pattern: /^(Statek z wolna doplywa do brzegu\.)$/,
        callback,
      };
      oneTimeTriggers.push(oneTimeTrigger);
      api.triggers.registerOneTime(oneTimeTrigger.pattern, oneTimeTrigger.callback);
      return true;
    });
  }

  // Test arrival alias
  api.aliases.register(/^test-arrival$/, () => {
    api.command.send('/fake --> Statek z wolna doplywa do brzegu.');
    return true;
  });

  // Lamp on alias
  api.aliases.register(/^la\+$/, () => {
    api.command.send('wyj lampe|olej');
    api.command.send('przytrocz lampe');
    api.command.send('naplam');
    api.command.send('/zap');
    return true;
  });

  // Lamp off alias
  api.aliases.register(/^la-$/, () => {
    api.command.send('/zg');
    api.command.send('odtrocz lampe');
    api.command.send('wlz lampe|oleje');
    return true;
  });

  // Review alias (pj)
  api.aliases.register(/^pj (.+)$/, ([, text]) => {
    api.command.send(`przejrzyj ${text}`);
    return true;
  });

  // Read alias (pr)
  api.aliases.register(/^pr (.+)$/, ([, text]) => {
    api.command.send(`przeczytaj ${text}`);
    return true;
  });

  // Help alias
  api.aliases.register(/^alias!$/, () => {
    api.output.print('┌─────────────────────────────┐');
    api.output.print('│   My Aliases               │');
    api.output.print('├─────────────────────────────┤');
    api.output.print('│ alias!         - Show help  │');
    api.output.print('│ la+            - Lamp on    │');
    api.output.print('│ la-            - Lamp off   │');
    api.output.print('│ pj <text>      - Review     │');
    api.output.print('│ pr <text>      - Read       │');
    api.output.print('│ test-arrival   - Test       │');
    api.output.print('└─────────────────────────────┘');
    return true;
  });
}
