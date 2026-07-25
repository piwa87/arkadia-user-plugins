import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { setupAliasy } from './aliases';
import { utworzBaze } from './store';
import { setupHof } from './hof';
import { setupKreator, TAG_KREATOR, TAG_MENU } from './creator';

/**
 * RKG — port of the CMud `mod_rkg` class: generate absurd club names and
 * automate Arkadia's club-creation dialogue.
 *
 * Every trigger tag this plugin can register. The client's unload cleanup
 * removes aliases and UI but NOT triggers, so destroy() must remove each of
 * these or a reload duplicates all of them.
 */
// Both are armed on demand by the creation dialogue (kreator.ts), possibly
// mid-run. Nothing is registered at init — the plugin adds no per-line work.
const TRIGGER_TAGS = [TAG_KREATOR, TAG_MENU];

let apiRef: PluginApi | null = null;
let zatrzymajKreator: (() => void) | null = null;
let zatrzymajHof: (() => void) | null = null;

export async function init(api: PluginApi): Promise<PluginInfo> {
  apiRef = api;

  const baza = utworzBaze();
  setupAliasy(api, baza);
  // Hof first: the dialogue runner hands each finished club straight to it.
  const hof = setupHof(api, baza);
  zatrzymajHof = hof.zatrzymaj;
  zatrzymajKreator = setupKreator(api, baza, (w) => hof.zaproponuj(w));

  const info: PluginInfo = {
    name: 'Rendom Klub Dżenerejtor',
    version: '0.1.0',
    author: 'Piot',
    description: 'Generator nazw klubow (podglad — nie zaklada klubu)',
  };
  api.output.print(`[${info.name} v${info.version}] loaded`);
  return info;
}

export async function destroy(): Promise<void> {
  zatrzymajKreator?.();
  zatrzymajKreator = null;
  zatrzymajHof?.();
  zatrzymajHof = null;
  if (apiRef) {
    for (const tag of TRIGGER_TAGS) apiRef.triggers.removeByTag(tag);
  }
  apiRef = null;
}
