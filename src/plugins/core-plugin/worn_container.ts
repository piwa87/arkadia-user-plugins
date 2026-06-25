import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../lib/registerTextAlias';

/** Polish grammatical forms of a worn container (bag/backpack). */
export interface WornContainerForms {
  /** Accusative — e.g. 'zalozona torbe', 'zalozony plecak'. */
  acc: string;
  /** Genitive — e.g. 'zalozonej torby', 'zalozonego plecaka'. */
  gen: string;
}

/**
 * Register the worn-container aliases (napt/obb/ot/wlz/wyj/zt) for a given
 * container's grammatical forms. Used per-character: jens -> torba (bag),
 * gertruda -> plecak (backpack). Returns a cleanup function.
 */
export function setupWornContainerAliases(api: PluginApi, forms: WornContainerForms): () => void {
  const { acc, gen } = forms;
  const ids: string[] = [];

  // napt - open the worn container and fill it
  ids.push(
    api.aliases.register(/^napt$/, () => {
      api.command.send(`otworz ${acc}`);
      api.command.send(`napelnij ${acc}`);
      return true;
    }),
  );

  // obb - peek inside the worn container
  ids.push(registerTextAlias(api, /^obb$/, `zajrzyj do ${gen}`));

  // ot - open the worn container
  ids.push(registerTextAlias(api, /^ot$/, `otworz ${acc}`));

  // wlz [what] - put items into the worn container
  ids.push(
    api.aliases.register(/^wlz(?:\s+(.+))?$/, (matches) => {
      const text = matches?.[1]?.trim();
      if (!text) return true;
      for (const item of text
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)) {
        api.command.send(`wloz ${item} do ${gen}`);
      }
      return true;
    }),
  );

  // wyj [what] - take items out of the worn container
  ids.push(
    api.aliases.register(/^wyj(?:\s+(.+))?$/, (matches) => {
      const text = matches?.[1]?.trim();
      if (!text) return true;
      for (const item of text
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)) {
        api.command.send(`wez ${item} z ${gen}`);
      }
      return true;
    }),
  );

  // zt - close the worn container and re-display worn equipment
  ids.push(
    api.aliases.register(/^zt$/, () => {
      api.command.send(`zamknij ${acc}`);
      api.command.send('la+');
      return true;
    }),
  );

  return () => {
    for (const id of ids) api.aliases.remove(id);
  };
}
