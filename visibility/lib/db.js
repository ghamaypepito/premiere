// Postgres access. Production uses Neon (DATABASE_URL); local dev and tests use PGlite on disk or in memory.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PAGES, blank, evaluate, scoreOf } from "../public/js/rules.js";

const SCHEMA = readFileSync(fileURLToPath(new URL("../db/schema.sql", import.meta.url)), "utf8");
let clientPromise = null;
let readyPromise = null;

async function client() {
  if (!clientPromise) {
    clientPromise = (async () => {
      if (process.env.DATABASE_URL) {
        const { Pool } = await import("@neondatabase/serverless");
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        return {
          query: async (text, params) => (await pool.query(text, params)).rows,
          exec: async (text) => { await pool.query(text); },
        };
      }
      const { PGlite } = await import("@electric-sql/pglite");
      const db = new PGlite(process.env.PGLITE_DIR || undefined); // unset = in memory
      return {
        query: async (text, params) => (await db.query(text, params)).rows,
        exec: async (text) => { await db.exec(text); },
      };
    })();
  }
  return clientPromise;
}

export async function q(text, params = []) {
  await ready();
  return (await client()).query(text, params);
}
export async function one(text, params = []) {
  return (await q(text, params))[0] || null;
}

export function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const c = await client();
      await c.exec(SCHEMA);
      await seed(c);
    })().catch((e) => { readyPromise = null; throw e; });
  }
  return readyPromise;
}

async function seed(c) {
  const [{ n }] = await c.query("SELECT count(*)::int AS n FROM pages");
  if (n === 0) {
    for (const t of PAGES) {
      const b = blank(t);
      const s = scoreOf(evaluate(b));
      await c.query(
        "INSERT INTO pages (id,name,url,type,brief,score,fails) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
        [t.id, t.name, t.url, t.type, JSON.stringify(b), s.total, s.fails]
      );
      await c.query("INSERT INTO page_versions (page_id,version,brief,score,fails,note) VALUES ($1,0,$2,$3,$4,'Starting brief from the page template') ON CONFLICT DO NOTHING",
        [t.id, JSON.stringify(b), s.total, s.fails]);
    }
  }
  const [{ m }] = await c.query("SELECT count(*)::int AS m FROM monitors");
  if (m === 0) {
    const site = siteUrl();
    const defaults = [
      ["Home page", site + "/", "Premier"],
      ["Succession page", site + "/what-we-do/succession-planning/", ""],
      ["Contact / booking", site + "/contact/", ""],
      ["WordPress REST API", site + "/wp-json/", "namespaces"],
    ];
    for (const [name, url, must] of defaults) {
      await c.query("INSERT INTO monitors (name,url,must_contain) VALUES ($1,$2,$3)", [name, url, must]);
    }
  }
}

export function siteUrl() {
  return (process.env.SITE_URL || "https://premierfamilybusiness.com").replace(/\/+$/, "");
}

export async function getSetting(key, fallback) {
  const r = await one("SELECT value FROM settings WHERE key=$1", [key]);
  return r ? r.value : fallback;
}
export async function setSetting(key, value) {
  await q("INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [key, JSON.stringify(value)]);
}

export async function logEvent({ kind, severity = "info", page_id = null, title, detail = {}, user_id = null }) {
  await q("INSERT INTO events (kind,severity,page_id,title,detail,user_id) VALUES ($1,$2,$3,$4,$5,$6)",
    [kind, severity, page_id, title, JSON.stringify(detail), user_id]);
}
