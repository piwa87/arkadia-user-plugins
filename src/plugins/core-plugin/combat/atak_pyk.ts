import type { PluginApi } from '@arkadia/plugin-types';
import { col13 } from '../../../lib/colors/my-colors';

const TAG = 'atakPyk';

export function setupAtakPyk(api: PluginApi): () => void {
  let enabled = false;
  let onCooldown = false;
  let cooldownTimer: ReturnType<typeof setTimeout> | null = null;

  const colorOn   = api.colors.fromHex('#00ff88');
  const colorOff  = api.colors.fromHex('#ff6644');
  const colorInfo = api.colors.fromHex('#888888');
  const colorFire = api.colors.fromHex('#ffdd00');

  const say = (text: string, color = colorInfo) => {
    const buf = new api.AnsiAwareBuffer();
    buf.append(text, color);
    api.output.print(buf);
  };

  const footer = api.ui.registerFooterComponent(
    'pyk',
    `<span style="color: ${col13}; font-weight: bold; margin-left: 8px;">PYK+</span>`,
    'start',
  );
  footer.setVisible(false);

  const idPlus = api.aliases.register(/^pyk\+$/i, () => {
    enabled = true;
    footer.setVisible(true);
    say('--> pyk', colorOn);
    return true;
  });

  const idMinus = api.aliases.register(/^pyk-$/i, () => {
    enabled = false;
    footer.setVisible(false);
    if (cooldownTimer) {
      clearTimeout(cooldownTimer);
      cooldownTimer = null;
    }
    onCooldown = false;
    say('--> juz nie pyk', colorOff);
    return true;
  });

  // Fires when someone designates a CEL ATAKU (attack target)
  api.triggers.register(/CEL ATT.*jako CEL ATAKU/, (line) => {
    if (!enabled || onCooldown) return line;

    const reactionMs = 150 + Math.floor(Math.random() * 350); // 150–500 ms human delay
    const cooldownSec = 9 + Math.floor(Math.random() * 3);    // 9–11 s cooldown

    say(`[pyk] >> reakcja za ${reactionMs}ms`, colorFire);

    setTimeout(() => {
      if (!enabled) return;
      api.command.send('zabij cel ataku', false);
      onCooldown = true;
      say(`[pyk] przerwa ${cooldownSec}s...`, colorInfo);
      cooldownTimer = setTimeout(() => {
        onCooldown = false;
        cooldownTimer = null;
        if (enabled) say('[pyk] gotowy', colorOn);
      }, cooldownSec * 1000);
    }, reactionMs);

    return line;
  }, TAG);

  return () => {
    if (cooldownTimer) clearTimeout(cooldownTimer);
    api.triggers.removeByTag(TAG);
    api.aliases.remove(idPlus);
    api.aliases.remove(idMinus);
    footer.remove();
  };
}
