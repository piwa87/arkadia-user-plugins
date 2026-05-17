import { buildProject } from "./lib.mjs";

const outputs = await buildProject();
const time = new Date().toLocaleTimeString('en-US', { hour12: false });
console.log(`✓ Built plugins at ${time}:`);
outputs.forEach((output) => console.log(`  - ${output}`));
