// Usage: node scripts/sync-pages.mjs <abs path to public/js/rules.js> <crawl.json> <worker/src/seed-pages.json> <out.sql>
// then: npx wrangler d1 execute DB --remote --file <out.sql>
// Builds SQL that syncs the tool's page list with the live sitemap (archive missing pages, add untracked live pages).
import { readFileSync, writeFileSync } from "node:fs";
const R = await import(process.argv[2]);
const crawl = JSON.parse(readFileSync(process.argv[3], "utf8"));
const seed = JSON.parse(readFileSync(process.argv[4], "utf8"));
const S = "https://premierfamilybusiness.com";
const live = crawl.pages.map((p) => ({ path: p.url.replace(S, ""), title: p.title, schema: p.schema }));
const tracked = new Set(seed.map((p) => p.url));
const sq = (v) => "'" + String(v).replace(/'/g, "''") + "'";
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const typeOf = (path) => path.startsWith("/what-we-do/") ? "service" : path.startsWith("/who-we-are/our-team/") ? "profile" : path === "/articles/" ? "hub" : "article";
const nameOf = (t, path) => t.split(/\s+[|–-]\s+/)[0].trim() || path;
const sql = [];
const archive = seed.filter((p) => !p.brief.noLive && !live.some((l) => l.path === p.url)).map((p) => p.id);
for (const id of archive) {
  sql.push(`UPDATE pages SET archived=1 WHERE id=${sq(id)};`);
  sql.push(`INSERT INTO events (at,kind,severity,page_id,title,detail) VALUES (${sq(now)},'brief','info',${sq(id)},${sq(`Archived: no longer on the live site (synced with the sitemap)`)},'{}');`);
}
const added = [];
for (const l of live) {
  if (tracked.has(l.path)) continue;
  const type = typeOf(l.path), slug = l.path.replace(/^\/|\/$/g, "").split("/").pop() || "home";
  const id = "c-" + slug.slice(0, 60);
  const name = (type === "profile" ? "Profile · " : "") + nameOf(l.title, l.path);
  const t = { ...R.TEMPL.article, id, name, url: l.path, type, p: "", custom: true, noLive: false,
    schema: type === "article" ? ["Article", "BreadcrumbList", "Person"] : type === "profile" ? ["Person", "WebPage", "BreadcrumbList"] : type === "service" ? ["Service", "FAQPage", "BreadcrumbList", "WebPage"] : ["CollectionPage", "BreadcrumbList"] };
  const b = R.blank(t); b.custom = true;
  const s = R.scoreOf(R.evaluate(b));
  sql.push(`INSERT OR IGNORE INTO pages (id,name,url,type,brief,score,fails,version,archived,updated_at) VALUES (${sq(id)},${sq(name)},${sq(l.path)},${sq(type)},${sq(JSON.stringify(b))},${s.total},${s.fails},0,0,${sq(now)});`);
  sql.push(`INSERT OR IGNORE INTO page_versions (page_id,version,brief,score,fails,changed,note,created_at) VALUES (${sq(id)},0,${sq(JSON.stringify(b))},${s.total},${s.fails},'[]','Added from the live sitemap',${sq(now)});`);
  added.push(`${type.padEnd(8)} ${name}  ${l.path}`);
}
sql.push(`INSERT INTO events (at,kind,severity,title,detail) VALUES (${sq(now)},'system','info',${sq(`Page list synced with the live sitemap: ${added.length} added, ${archive.length} archived`)},'{}');`);
writeFileSync(process.argv[5], sql.join("\n") + "\n");
console.log("ARCHIVE:", archive.join(", ")); console.log(`ADD (${added.length}):`); added.forEach((a) => console.log("  " + a));
