import type { PluginApi } from '@arkadia/plugin-types';

export function setupDooAliases(api: PluginApi): void {
  // ── Multibind shortcuts ─────────────────────────────────────────────────────
  // `doo` / `doo2..4` fire the action stored in multibind slot 1..4 (falls back
  // to `sig nic` if empty). `doo+ <action>` sets slot 1, `doo-` clears it.

  let currentBinds: { index: number; action: string }[] = [];

  const onMultibinds = ({ list }: { list: { index: number; action: string; label: string }[] }) => {
    currentBinds = list;
  };
  api.events.on('multibinds', onMultibinds);

  const runBind = (index: number) => {
    const entry = currentBinds.find((b) => b.index === index);
    if (!entry) {
      api.command.send('sig nic');
      return;
    }
    api.command.send(entry.action);
  };

  api.aliases.register(/^doo([2-4])?$/i, (matches) => {
    const index = matches?.[1] ? parseInt(matches[1], 10) : 1;
    runBind(index);
    return true;
  });

  api.aliases.register(/^doo\+\s+(.+)$/i, (matches) => {
    api.command.send(`/mbind 1 ${matches![1]}`, true);
    return true;
  });

  api.aliases.register(/^doo-$/i, () => {
    api.command.send('/mbind- 1', false);
    return true;
  });
}
