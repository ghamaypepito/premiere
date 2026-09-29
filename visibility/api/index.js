// Vercel serverless entry. vercel.json rewrites /api/* here and passes the sub-path as ?__path=.
import { handle } from "../lib/routes.js";


export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = "/" + (url.searchParams.get("__path") ?? url.pathname.replace(/^\/api\/?/, "")).replace(/^\/+/, "");
  let body = req.body;
  if (body === undefined && req.method !== "GET") body = await readBody(req);
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
  const secure = (req.headers["x-forwarded-proto"] || "").includes("https");
  const out = await handle({ method: req.method, path, body, headers: req.headers, secure });
  res.statusCode = out.status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v);
  res.end(JSON.stringify(out.body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}
