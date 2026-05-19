import type { PluginApi } from '@arkadia/plugin-types';

export function setupLocations(api: PluginApi): () => void {
  const tag = 'ra:locations';

  api.triggers.register(
    /starajac sie nie zwracac na siebie uwagi daje susa i wskakuje za zagrode\./,
    (line) => {
      api.bind.set('wejdz do zagrody');
      return line;
    },
    tag,
  );

  api.triggers.register(
    /starajac sie nie zwracac na siebie uwagi przechodzi na zaplecze\./,
    (line) => {
      api.bind.set('przejdz na zaplecze');
      return line;
    },
    tag,
  );

  return () => {
    api.triggers.removeByTag(tag);
  };
}
