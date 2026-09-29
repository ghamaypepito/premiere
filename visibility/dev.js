// Local development server: serves public/ and the API with an on-disk PGlite database.
//   npm run dev   ->  http://localhost:3000   (first sign-in uses ADMIN_EMAIL / ADMIN_PASSWORD)
import http from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

process.env.PGLITE_DIR ??= fileURLToPath(new URL("./.data/pglite", import.meta.url));
mkdirSync(process.env.PGLITE_DIR, { recursive: true });
process.env.ADMIN_EMAIL ??= "admin@example.com";
process.env.ADMIN_PASSWORD ??= "change-me-please";
const { default: handler } = await import("./api/index.js");

const root = fileURLToPath(new URL("./public/", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".md": "text/markdown; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
const port = +(process.env.PORT || 3000);

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) return handler(req, res);
  const file = normalize(join(root, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) { res.statusCode = 403; return res.end(); }
  try {
    const buf = await readFile(file);
    res.setHeader("content-type", types[extname(file)] || "application/octet-stream");
    res.end(buf);
  } catch {
    res.setHeader("content-type", types[".html"]);
    res.end(await readFile(join(root, "index.html")));
  }
}).listen(port, () => console.log(`Premier Visibility on http://localhost:${port}  (sign in: ${process.env.ADMIN_EMAIL})`));
