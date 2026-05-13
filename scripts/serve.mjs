import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DIST_DIR, DEFAULT_PORT } from "./lib.mjs";

const CONTENT_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"]
]);

function resolvePath(urlPath) {
  const safePath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const requested = safePath === "/" ? "/index.html" : safePath;
  return path.join(DIST_DIR, requested);
}

export function startServer(port = DEFAULT_PORT) {
  const server = http.createServer(async (req, res) => {
    try {
      const filePath = resolvePath(req.url || "/");
      const resolved = path.resolve(filePath);

      if (!resolved.startsWith(path.resolve(DIST_DIR))) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      const stat = await fs.stat(resolved).catch(() => null);
      if (!stat || stat.isDirectory()) {
        res.writeHead(404, {
          "Access-Control-Allow-Origin": "*"
        });
        res.end("Not found");
        return;
      }

      const ext = path.extname(resolved);
      const body = await fs.readFile(resolved);

      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": CONTENT_TYPES.get(ext) || "application/octet-stream"
      });
      res.end(body);
    } catch (error) {
      res.writeHead(500, {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "text/plain; charset=utf-8"
      });
      res.end(error instanceof Error ? error.message : String(error));
    }
  });

  server.listen(port, () => {
    console.log(`Preview server running at http://localhost:${port}`);
  });

  return server;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer();
}
