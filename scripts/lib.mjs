import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const CURRENT_FILE = fileURLToPath(import.meta.url);

export const ROOT_DIR = path.resolve(path.dirname(CURRENT_FILE), "..");
export const SRC_DIR = path.join(ROOT_DIR, "src");
export const PLUGINS_DIR = path.join(SRC_DIR, "plugins");
export const DIST_DIR = path.join(ROOT_DIR, "dist");
export const DEFAULT_PORT = Number(process.env.PORT || 3030);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return fullPath;
  }));
  return files.flat();
}

export async function getPluginEntries() {
  const exists = await fs.stat(PLUGINS_DIR).then(() => true).catch(() => false);
  if (!exists) {
    return [];
  }

  const files = await walk(PLUGINS_DIR);
  return files
    .filter((file) => file.endsWith("-plugin.ts"))
    .sort();
}

export function relativePluginOutput(filePath) {
  const relativePath = path.relative(PLUGINS_DIR, filePath);
  return toPosix(relativePath.replace(/\.ts$/, ".js"));
}

export async function generateIndex(entryPoints) {
  const plugins = entryPoints.map((entryPoint) => ({
    name: path.basename(entryPoint, ".ts"),
    file: relativePluginOutput(entryPoint)
  }));

  const pluginsJson = JSON.stringify({ plugins }, null, 2);
  await fs.writeFile(path.join(DIST_DIR, "plugins.json"), `${pluginsJson}\n`);

  const items = plugins.map((plugin) => {
    return `<li><a href="./${plugin.file}">${plugin.name}</a><div><code>${plugin.file}</code></div></li>`;
  }).join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Arkadia User Plugins</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f3efe6;
      --panel: #fffaf0;
      --text: #1f2933;
      --accent: #b45309;
      --border: #e5d3b3;
    }
    body {
      margin: 0;
      font-family: Georgia, "Iowan Old Style", serif;
      background: radial-gradient(circle at top, #fffdf8, var(--bg));
      color: var(--text);
    }
    main {
      max-width: 840px;
      margin: 48px auto;
      padding: 0 20px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 14px 40px rgba(79, 55, 24, 0.08);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 2rem;
    }
    p {
      margin: 0 0 18px;
      line-height: 1.6;
    }
    ul {
      padding-left: 20px;
      margin: 0;
    }
    li {
      margin: 0 0 16px;
    }
    a {
      color: var(--accent);
      font-weight: 700;
      text-decoration: none;
    }
    code {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 8px;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <main>
    <section class="panel">
      <h1>Arkadia User Plugins</h1>
      <p>Build output for hosted Arkadia Web Client plugins. Copy a plugin URL into the client's Scripts panel.</p>
      <ul>
        ${items || "<li>No plugin entries found.</li>"}
      </ul>
    </section>
  </main>
</body>
</html>
`;

  await fs.writeFile(path.join(DIST_DIR, "index.html"), html);
}

export async function buildProject() {
  const entryPoints = await getPluginEntries();
  if (entryPoints.length === 0) {
    throw new Error("No plugin entry files found under src/plugins");
  }

  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.mkdir(DIST_DIR, { recursive: true });

  await esbuild.build({
    entryPoints,
    outdir: DIST_DIR,
    outbase: PLUGINS_DIR,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    sourcemap: false,
    minify: false,
    logLevel: "info"
  });

  await generateIndex(entryPoints);
  return entryPoints.map((entryPoint) => relativePluginOutput(entryPoint));
}
