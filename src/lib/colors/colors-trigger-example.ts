import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { createColorWithBackground } from './my-colors';

/**
 * Example: Colors Trigger
 * Demonstrates how to use foreground and background colors together.
 *
 * Pattern: 'Jestes ledwo zywy' (You are barely alive)
 * Colors: White text (col15) on dark red background (bg4)
 *
 * Note: Uses col15 from my-colors.ts and conceptually bg4 from my-bg-colors.ts
 * For pure background-only coloring, use getBgColor() from my-bg-colors.ts
 */
export async function init(api: PluginApi): Promise<PluginInfo> {
  const tag = 'colorsTriggerExample';

  api.triggers.register(
    /Jestes ledwo zywy/i,
    (line) => {
      return line.color([0, line.length], createColorWithBackground(15, 4, api));
    },
    tag,
  );

  return {
    name: 'Colors Trigger Example',
    version: '1.0.0',
    description: 'Example trigger demonstrating foreground and background coloring',
  };
}
