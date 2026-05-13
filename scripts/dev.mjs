import chokidar from "chokidar";
import { buildProject, SRC_DIR, DEFAULT_PORT } from "./lib.mjs";
import { startServer } from "./serve.mjs";

let building = false;
let queued = false;

async function rebuild(reason) {
  if (building) {
    queued = true;
    return;
  }

  building = true;
  try {
    const outputs = await buildProject();
    console.log(`[build] ${reason}`);
    outputs.forEach((output) => console.log(`- ${output}`));
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

const watcher = chokidar.watch(SRC_DIR, { ignoreInitial: true });
watcher.on("all", async (eventName, changedPath) => {
  await rebuild(`${eventName}: ${changedPath}`);
});

console.log(`Watching ${SRC_DIR} for changes`);
