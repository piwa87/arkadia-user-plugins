import path from "node:path";
import chokidar from "chokidar";
import { buildProject, PLUGINS_DIR, SRC_DIR, DEFAULT_PORT } from "./lib.mjs";
import { startServer } from "./serve.mjs";

// Plugins skipped during local dev — built on GitHub Pages instead.
// my-sounds-plugin bundles ~2.6 MB of audio data and rarely changes.
const DEV_EXCLUDE = ["my-sounds-plugin"];

let building = false;
let queued = false;

async function rebuild(reason) {
  if (building) {
    queued = true;
    return;
  }

  building = true;
  try {
    const outputs = await buildProject({ exclude: DEV_EXCLUDE });
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(`✓ [build] ${reason} at ${time}`);
    outputs.forEach((output) => console.log(`  - ${output}`));
  } catch (error) {
    console.error("[build] failed", error);
  } finally {
    building = false;
    if (queued) {
      queued = false;
      await rebuild("queued change");
    }
  }
}

await rebuild("initial build");
startServer(DEFAULT_PORT);

if (DEV_EXCLUDE.length > 0) {
  console.log(`Excluded from dev build: ${DEV_EXCLUDE.join(", ")}`);
}

// Don't rebuild when only an excluded plugin's files change.
const excludedPaths = DEV_EXCLUDE.map((name) => path.join(PLUGINS_DIR, name));
const watcher = chokidar.watch(SRC_DIR, {
  ignoreInitial: true,
  ignored: (p) => excludedPaths.some((prefix) => p.startsWith(prefix)),
});
watcher.on("all", async (eventName, changedPath) => {
  await rebuild(`${eventName}: ${changedPath}`);
});

console.log(`Watching ${SRC_DIR} for changes`);
