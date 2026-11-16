// Premier Visibility on Cloudflare Workers.
//   /api/*   JSON API (behind Cloudflare Access)
//   /report  public visibility report (Access bypass)
//   other    the web app's files, bundled into the Worker (behind Cloudflare Access)
import { handleApi, jobUptime, jobDaily } from "./api.js";
import { renderReport } from "./report.js";
import { FILES } from "./static.js";
import { ensureSeed } from "./util.js";

const decoded = new Map();
function serveStatic(url) {
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  const f = FILES[path];
  if (!f) return new Response("Not found", { status: 404 });
  let body = decoded.get(path);
  if (!body) { body = f.text ? f.body : Uint8Array.from(atob(f.body), (c) => c.charCodeAt(0)); decoded.set(path, body); }
  const cache = path === "/index.html" ? "no-cache" : "public, max-age=300";
  return new Response(body, { headers: { "content-type": f.type, "cache-control": cache, "x-robots-tag": "noindex, nofollow", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "same-origin" } });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) return handleApi(req, env, ctx);
    if (url.pathname === "/report" || url.pathname === "/report/") {
      const cache = caches.default, key = new Request(new URL("/report", url).toString());
      const hit = await cache.match(key);
      if (hit) return hit;
      const res = await renderReport(env);
      ctx.waitUntil(cache.put(key, res.clone()));
      return res;
    }
    if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
    return serveStatic(url);
  },

  // "*/5 * * * *": uptime checks plus one page audit; "0 22 * * *": WordPress status and pruning.
  async scheduled(event, env, ctx) {
    await ensureSeed(env);
    if (event.cron === "0 22 * * *") await jobDaily(env);
    else await jobUptime(env);
  },
};
