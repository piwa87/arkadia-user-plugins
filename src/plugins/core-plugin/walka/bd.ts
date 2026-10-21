import type { PluginApi } from '@arkadia/plugin-types';

/** CMud's bd: advance with c1 after our/team kills, up to the initial enemy count. */
export function setupBd(api: PluginApi): () => void {
  let current = 1;
  let total = 0;
  let armed = false;
  let attackTimer: ReturnType<typeof setTimeout> | undefined;
  let cooldown: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    armed = false;
    total = 0;
    clearTimeout(attackTimer);
    clearTimeout(cooldown);
  };

  api.aliases.register(/^bd$/i, () => {
    stop();
    current = 1;
    total = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest').length;
    armed = total > 1;
    api.command.send(`sig Lejemy do: ${total}`);
    return true;
  });
  api.aliases.register(/^bd-$/i, () => {
    stop();
    api.output.print('--> bd wylaczone');
    return true;
  });

  const onKill = ({ killer }: { killer: 'ME' | 'TEAM' | 'OTHER' }) => {
    if (killer === 'OTHER' || total === 0) return;
    current++;
    if (current > total) {
      stop();
      return;
    }
    if (!armed) return;
    armed = false;
    api.command.send(`sig Bije kolejnego! [${current}]`);
    attackTimer = setTimeout(() => {
      attackTimer = undefined;
      api.command.send('c1');
    }, 70 + Math.floor(Math.random() * 486));
    cooldown = setTimeout(() => {
      cooldown = undefined;
      armed = true;
    }, 5000);
  };

  api.events.on('kill', onKill);
  api.events.on('mapMove', stop);
  api.events.on('client.disconnect', stop);
  return () => {
    stop();
    api.events.off('kill', onKill);
    api.events.off('mapMove', stop);
    api.events.off('client.disconnect', stop);
  };
}
