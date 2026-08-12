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

export async function getPluginEntries({ exclude = [] } = {}) {
  const exists = await fs.stat(PLUGINS_DIR).then(() => true).catch(() => false);
  if (!exists) {
    return [];
  }

  const files = await walk(PLUGINS_DIR);
  return files
    .filter((file) => file.endsWith("-plugin.ts"))
    .filter((file) => !exclude.includes(path.basename(file, ".ts")))
    .sort();
}

export async function getPrebuiltPlugins({ exclude = [] } = {}) {
  const exists = await fs.stat(PLUGINS_DIR).then(() => true).catch(() => false);
  if (!exists) return [];

  const files = await walk(PLUGINS_DIR);
  return files
    .filter((file) => file.endsWith(".js"))
    .filter((file) => !exclude.includes(path.basename(file, ".js")))
    .sort();
}

async function copyPrebuiltPlugins({ exclude = [] } = {}) {
  const files = await getPrebuiltPlugins({ exclude });
  await Promise.all(files.map(async (file) => {
    const relative = path.relative(PLUGINS_DIR, file);
    const dest = path.join(DIST_DIR, toPosix(relative));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(file, dest);
  }));
  return files;
}

export function relativePluginOutput(filePath) {
  const relativePath = path.relative(PLUGINS_DIR, filePath);
  return toPosix(relativePath.replace(/\.ts$/, ".js"));
}

export async function generateIndex(plugins) {
  const items = plugins.map((plugin) => {
    return `<li><a href="./${plugin.file}">${plugin.name}</a><code>${plugin.file}</code></li>`;
  }).join("\n");

  const html = `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Prywatny indeks</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0d1410;
      --panel: #151f19;
      --text: #dbe5de;
      --muted: #829087;
      --accent: #d6b85d;
      --border: #33463a;
      --danger: #d98578;
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      background: linear-gradient(145deg, #111b15, var(--bg) 62%);
      color: var(--text);
    }
    main {
      width: min(620px, calc(100% - 32px));
      margin: 32px auto;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      padding: clamp(24px, 6vw, 42px);
      box-shadow: 12px 12px 0 #080c09;
    }
    h1 {
      margin: 8px 0 10px;
      font-family: Georgia, "Iowan Old Style", serif;
      font-size: clamp(2rem, 8vw, 3.3rem);
      line-height: .95;
      color: var(--accent);
    }
    p {
      margin: 0 0 24px;
      line-height: 1.6;
    }
    .stamp {
      margin: 0;
      color: var(--muted);
      font-size: .72rem;
      letter-spacing: .18em;
    }
    label {
      display: block;
      margin-bottom: 7px;
      color: var(--muted);
      font-size: .76rem;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .row { display: flex; gap: 8px; }
    input, button {
      min-height: 44px;
      border: 1px solid var(--border);
      border-radius: 0;
      font: inherit;
    }
    input {
      min-width: 0;
      flex: 1;
      padding: 0 12px;
      background: #0c120e;
      color: var(--text);
    }
    button {
      padding: 0 18px;
      background: var(--accent);
      color: #17150d;
      font-weight: 800;
      cursor: pointer;
    }
    input:focus-visible, button:focus-visible, a:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
    }
    .status {
      min-height: 1.5em;
      margin: 12px 0 0;
      color: var(--danger);
      font-size: .82rem;
    }
    .vault-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
    }
    .vault-head h1 { margin-bottom: 0; }
    .secondary {
      min-height: 36px;
      padding: 0 12px;
      background: transparent;
      color: var(--muted);
      font-size: .76rem;
    }
    ul {
      padding: 24px 0 0;
      margin: 0;
      list-style: none;
    }
    li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      padding: 13px 0;
      border-bottom: 1px solid var(--border);
    }
    a {
      color: var(--accent);
      font-weight: 700;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    code {
      color: var(--muted);
      font-size: .72rem;
    }
    [hidden] { display: none !important; }
    @media (max-width: 520px) {
      .row { flex-direction: column; }
      li { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <section id="gate" class="panel" aria-labelledby="gate-title">
      <p class="stamp">ARKADIA // ARCHIWUM</p>
      <h1 id="gate-title">Indeks zamknięty</h1>
      <p>Podaj hasło, aby otworzyć prywatną listę.</p>
      <form id="gate-form">
        <label for="password">Hasło</label>
        <div class="row">
          <input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
          <button type="submit">Otwórz</button>
        </div>
        <p id="status" class="status" aria-live="polite"></p>
      </form>
    </section>
    <section id="vault" class="panel" aria-labelledby="vault-title" hidden>
      <header class="vault-head">
        <div>
          <p class="stamp">ARKADIA // ARCHIWUM</p>
          <h1 id="vault-title">Pluginy</h1>
        </div>
        <button id="lock" class="secondary" type="button">Zamknij</button>
      </header>
      <ul>
        ${items || "<li>Brak pluginów.</li>"}
      </ul>
    </section>
  </main>
  <script>
    (() => {
      const expected = '04a54d76491c75c8c87b47977fde6f455fadbee42a0cda0970b1ddb966f6a347';
      const sessionKey = 'arkadia-plugin-index-unlocked';
      const gate = document.querySelector('#gate');
      const vault = document.querySelector('#vault');
      const form = document.querySelector('#gate-form');
      const password = document.querySelector('#password');
      const status = document.querySelector('#status');

      const unlock = () => {
        gate.hidden = true;
        vault.hidden = false;
      };

      const digest = async (value) => {
        const bytes = new TextEncoder().encode(value);
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return [...new Uint8Array(hash)]
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');
      };

      try {
        if (sessionStorage.getItem(sessionKey) === expected) unlock();
      } catch {}

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.textContent = '';
        if (await digest(password.value) !== expected) {
          password.select();
          status.textContent = 'Nieprawidłowe hasło.';
          return;
        }
        password.value = '';
        try { sessionStorage.setItem(sessionKey, expected); } catch {}
        unlock();
      });

      document.querySelector('#lock').addEventListener('click', () => {
        try { sessionStorage.removeItem(sessionKey); } catch {}
        location.reload();
      });
    })();
  </script>
</body>
</html>
`;

  await fs.writeFile(path.join(DIST_DIR, "index.html"), html);
}

export async function buildProject({ exclude = [] } = {}) {
  const entryPoints = await getPluginEntries({ exclude });
  const prebuiltCheck = await getPrebuiltPlugins();
  if (entryPoints.length === 0 && prebuiltCheck.length === 0) {
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

  const prebuilt = await copyPrebuiltPlugins({ exclude });

  const compiledPlugins = entryPoints.map((f) => ({
    name: path.basename(f, ".ts"),
    file: relativePluginOutput(f),
  }));
  const prebuiltPlugins = prebuilt.map((f) => {
    const rel = toPosix(path.relative(PLUGINS_DIR, f));
    return { name: path.basename(f, ".js"), file: rel };
  });

  await generateIndex([...compiledPlugins, ...prebuiltPlugins]);
  return [...compiledPlugins, ...prebuiltPlugins].map((p) => p.file);
}
