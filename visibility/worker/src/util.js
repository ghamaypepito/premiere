// Shared helpers: time, JSON, D1 access, settings, activity log, first-run seeding.
import SEED from "./seed-pages.json";

export const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString().replace(/\.\d{3}Z$/, "Z");
export const dj = (v) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return v; } };
export const j = (v) => JSON.stringify(v);
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const need = (cond, status, msg) => { if (!cond) throw new HttpError(status, msg); };
export const str = (v, max = 500) => String(v ?? "").trim().slice(0, max);
export const siteUrl = (env) => String(env.SITE_URL || "https://premierfamilybusiness.com").replace(/\/+$/, "");

export async function q(env, sql, ...params) { return (await env.DB.prepare(sql).bind(...params).all()).results || []; }
export async function one(env, sql, ...params) { return (await env.DB.prepare(sql).bind(...params).first()) || null; }
export async function run(env, sql, ...params) { return env.DB.prepare(sql).bind(...params).run(); }

// Turn JSON text columns back into objects and 0/1 flags into booleans for the front end.
export function shape(rows, json = [], bools = []) {
  return rows.map((r) => {
    const o = { ...r };
    for (const k of json) if (k in o) o[k] = dj(o[k]);
    for (const k of bools) if (k in o && o[k] !== null) o[k] = !!o[k];
    return o;
  });
}

export async function getSetting(env, k, fallback = null) {
  const r = await one(env, "SELECT value FROM settings WHERE k=?", k);
  return r ? dj(r.value) : fallback;
}
export async function setSetting(env, k, v) {
  await run(env, "INSERT INTO settings (k,value) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET value=excluded.value", k, j(v));
}
export async function logEvent(env, { kind, title, severity = "info", page_id = null, detail = {}, user_id = null }) {
  await run(env, "INSERT INTO events (at,kind,severity,page_id,title,detail,user_id) VALUES (?,?,?,?,?,?,?)",
    iso(), kind, severity, page_id, String(title).slice(0, 1000), j(detail), user_id);
}

// Seed the 20 starting briefs and the default monitors once.
let seeded = false;
export async function ensureSeed(env) {
  if (seeded) return;
  const n = await one(env, "SELECT COUNT(*) AS n FROM pages");
  if (!n || n.n === 0) {
    const now = iso();
    const stmts = [];
    for (const p of SEED) {
      stmts.push(env.DB.prepare("INSERT OR IGNORE INTO pages (id,name,url,type,brief,score,fails,version,archived,updated_at) VALUES (?,?,?,?,?,?,?,0,0,?)")
        .bind(p.id, p.name, p.url, p.type, j(p.brief), p.score, p.fails, now));
      stmts.push(env.DB.prepare("INSERT OR IGNORE INTO page_versions (page_id,version,brief,score,fails,changed,note,created_at) VALUES (?,0,?,?,?,'[]','Starting brief from the page template',?)")
        .bind(p.id, j(p.brief), p.score, p.fails, now));
    }
    await env.DB.batch(stmts);
  }
  const m = await one(env, "SELECT COUNT(*) AS n FROM monitors");
  if (!m || m.n === 0) {
    const s = siteUrl(env);
    await env.DB.batch([["Home page", `${s}/`, "Premier"], ["Family Enterprise Planning", `${s}/what-we-do/family-enterprise-planning/`, ""],
      ["Get in Touch", `${s}/get-in-touch/`, ""], ["WordPress PHP (REST API)", `${s}/wp-json/`, "namespaces"]]
      .map(([name, url, must]) => env.DB.prepare("INSERT INTO monitors (name,url,must_contain) VALUES (?,?,?)").bind(name, url, must)));
  }
  seeded = true;
}

export function fmtMins(m) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return h < 48 ? `${h} h${r ? ` ${r} min` : ""}` : `${Math.round(h / 24)} days`;
}
export const splitList = (s) => String(s || "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
