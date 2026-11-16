// Sign-in is handled by Cloudflare Access in front of the subdomain. Every request carries a signed
// JWT (Cf-Access-Jwt-Assertion); we verify its signature, audience, issuer and expiry here.
import { one, run, iso } from "./util.js";

let certCache = { at: 0, keys: [] };

const b64urlToBytes = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function accessKeys(team) {
  if (Date.now() - certCache.at < 3600e3 && certCache.keys.length) return certCache.keys;
  const r = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error(`Could not load Access certificates (${r.status})`);
  certCache = { at: Date.now(), keys: (await r.json()).keys || [] };
  return certCache.keys;
}

export async function verifyAccessJwt(token, env) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  let header, payload;
  try { header = b64urlJson(h); payload = b64urlJson(p); } catch { return null; }
  if (header.alg !== "RS256") return null;
  const team = env.ACCESS_TEAM_DOMAIN;
  const keys = await accessKeys(team);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) { certCache.at = 0; return null; }
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(sig), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return null;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!env.ACCESS_AUD || !aud.includes(env.ACCESS_AUD)) return null;
  if (payload.iss !== `https://${team}`) return null;
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
  return payload.email ? String(payload.email).toLowerCase() : null;
}

// Returns the signed-in user, creating their record on first visit.
export async function currentUser(req, env) {
  let email = null;
  if (env.DEV_AUTH_EMAIL) email = (req.headers.get("x-dev-email") || env.DEV_AUTH_EMAIL).toLowerCase(); // local development only
  else email = await verifyAccessJwt(req.headers.get("cf-access-jwt-assertion"), env);
  if (!email) return null;
  let u = await one(env, "SELECT id,email,name,role FROM users WHERE email=?", email);
  if (!u) {
    const admins = String(env.ADMIN_EMAILS || "").toLowerCase().split(/[,\s]+/).filter(Boolean);
    const first = !(await one(env, "SELECT id FROM users LIMIT 1"));
    const role = admins.includes(email) || first ? "admin" : "editor";
    const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    await run(env, "INSERT INTO users (email,name,role,created_at,last_seen) VALUES (?,?,?,?,?)", email, name, role, iso(), iso());
    u = await one(env, "SELECT id,email,name,role FROM users WHERE email=?", email);
  }
  return u;
}

export const canEdit = (u) => u && (u.role === "admin" || u.role === "editor");
export const isAdmin = (u) => u && u.role === "admin";
