import { buildProject } from "./lib.mjs";

const outputs = await buildProject();
console.log("Built plugins:");
outputs.forEach((output) => console.log(`- ${output}`));
