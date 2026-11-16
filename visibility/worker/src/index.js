// Premier Visibility on Cloudflare Workers.
//   /, /report       public visibility report (no sign-in)
//   /admin/          the team app, bundled into the Worker (behind Cloudflare Access)
//   /admin/api/*     JSON API (behind Cloudflare Access; /api/* is accepted too)
import { handleApi, jobUptime, jobDaily } from "./api.js";
import { renderReport } from "./report.js";
import { FILES } from "./static.js";
import { ensureSeed } from "./util.js";

const decoded = new Map();
function serveStatic(url) {
  const sub = url.pathname.replace(/^\/admin/, "");
  const path = sub === "/" || sub === "" ? "/index.html" : sub;
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
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin/api/")) return handleApi(req, env, ctx);
    if (url.pathname === "/admin") return Response.redirect(new URL("/admin/", url).toString(), 301);
    if (url.pathname === "/" || url.pathname === "/report" || url.pathname === "/report/") {
      const cache = caches.default, key = new Request(new URL("/", url).toString());
      const hit = await cache.match(key);
      if (hit) return hit;
      const res = await renderReport(env);
      ctx.waitUntil(cache.put(key, res.clone()));
      return res;
    }
    if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
    if (url.pathname.startsWith("/admin/")) return serveStatic(url);
    return Response.redirect(new URL("/", url).toString(), 302);
  },

  // "*/5 * * * *": uptime checks plus one page audit; "0 22 * * *": WordPress status and pruning.
  async scheduled(event, env, ctx) {
    await ensureSeed(env);
    if (event.cron === "0 22 * * *") await jobDaily(env);
    else await jobUptime(env);
  },
};
