// Fetches a live page, extracts what search engines and answer engines see, and records what changed.
import { createHash } from "node:crypto";
import { q, one, logEvent, siteUrl } from "./db.js";
import { notify } from "./notify.js";

const decode = (s) => String(s || "")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&nbsp;/g, " ").replace(/&#8211;/g, "–").replace(/&#8212;/g, "—").replace(/&#8217;/g, "’").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/\s+/g, " ").trim();
const strip = (h) => decode(String(h || "").replace(/<[^>]+>/g, " "));

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? "") : null;
}
function metaContent(html, key, val) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if ((attr(tag, key) || "").toLowerCase() === val) return attr(tag, "content");
  }
  return null;
}
function linkHref(html, rel) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if ((attr(tag, "rel") || "").toLowerCase().split(/\s+/).includes(rel)) return attr(tag, "href");
  }
  return null;
}
function schemaTypes(html) {
  const types = new Set(); let invalid = 0;
  const walk = (n) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === "object") {
      const t = n["@type"]; (Array.isArray(t) ? t : t ? [t] : []).forEach((x) => types.add(String(x)));
      Object.values(n).forEach(walk);
    }
  };
  for (const m of html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(m[1].trim())); } catch { invalid++; }
  }
  return { types: [...types].sort(), invalid };
}

export function extract(html, pageUrl, headers = {}) {
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [html])[0];
  const bodyHtml = (html.match(/<body[\s\S]*<\/body>/i) || [html])[0]
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const h1 = [...bodyHtml.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => strip(m[1])).filter(Boolean);
  const h2 = [...bodyHtml.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => strip(m[1])).filter(Boolean);
  const text = strip(bodyHtml);
  const host = new URL(pageUrl).hostname;
  let internal = 0, external = 0;
  for (const tag of bodyHtml.match(/<a\b[^>]*>/gi) || []) {
    const href = attr(tag, "href"); if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue;
    try { (new URL(href, pageUrl).hostname === host ? internal++ : external++); } catch {}
  }
  const imgs = bodyHtml.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter((t) => { const a = attr(t, "alt"); return a === null || a.trim() === ""; }).length;
  const robots = [metaContent(head, "name", "robots"), headers["x-robots-tag"]].filter(Boolean).join(", ");
  const sc = schemaTypes(html);
  return {
    title: strip((head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ""),
    metaDesc: metaContent(head, "name", "description") || "",
    robots,
    noindex: /noindex/i.test(robots),
    canonical: linkHref(head, "canonical") || "",
    h1, h2Count: h2.length, h2Questions: h2.filter((x) => /\?\s*$/.test(x)).length,
    ogTitle: metaContent(head, "property", "og:title") || "",
    ogImage: metaContent(head, "property", "og:image") || "",
    schema: sc.types, schemaInvalid: sc.invalid,
    hreflang: (head.match(/<link\b[^>]*hreflang[^>]*>/gi) || []).map((t) => attr(t, "hreflang")).filter(Boolean),
    lang: attr((html.match(/<html\b[^>]*>/i) || [""])[0], "lang") || "",
    words: (text.match(/[A-Za-z0-9À-ɏ'’-]+/g) || []).length,
    internalLinks: internal, externalLinks: external, images: imgs.length, imagesNoAlt: noAlt,
  };
}

// Fields compared between snapshots, with how serious a change is.
const WATCH = [
  ["title", "Title", "warn"], ["metaDesc", "Meta description", "warn"], ["canonical", "Canonical URL", "warn"],
  ["robots", "Robots directives", "warn"], ["h1", "H1", "warn"], ["schema", "Schema types", "warn"],
  ["ogImage", "Social image", "info"], ["lang", "Language", "info"], ["hreflang", "hreflang", "info"],
];

export function diffSnapshots(prev, cur, prevStatus, curStatus) {
  const changes = [];
  if (prevStatus !== curStatus) changes.push({ field: "status", label: "HTTP status", before: prevStatus, after: curStatus, severity: curStatus >= 400 ? "critical" : prevStatus >= 400 ? "good" : "warn" });
  if (!prev || !cur) return changes;
  for (const [k, label, sev] of WATCH) {
    const a = JSON.stringify(prev[k] ?? ""), b = JSON.stringify(cur[k] ?? "");
    if (a !== b) changes.push({ field: k, label, before: prev[k], after: cur[k], severity: sev });
  }
  if (!prev.noindex && cur.noindex) changes.push({ field: "noindex", label: "Page is now set to noindex", before: false, after: true, severity: "critical" });
  if (prev.title && !cur.title) changes.push({ field: "titleMissing", label: "Title tag removed", before: prev.title, after: "", severity: "critical" });
  const lost = (prev.schema || []).filter((t) => !(cur.schema || []).includes(t));
  if (lost.length) changes.push({ field: "schemaLost", label: `Schema removed: ${lost.join(", ")}`, before: prev.schema, after: cur.schema, severity: "warn" });
  if (prev.words && cur.words < prev.words * 0.7) changes.push({ field: "words", label: `Word count dropped ${prev.words} → ${cur.words}`, before: prev.words, after: cur.words, severity: "warn" });
  return changes;
}

// Compares the live page with the approved brief.
export function driftFromBrief(live, brief) {
  const out = [];
  const n = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (brief.seoTitle && n(live.title) !== n(brief.seoTitle)) out.push({ field: "Title", brief: brief.seoTitle, live: live.title });
  if (brief.metaDesc && n(live.metaDesc) !== n(brief.metaDesc)) out.push({ field: "Meta description", brief: brief.metaDesc, live: live.metaDesc });
  if (brief.h1 && !(live.h1 || []).some((h) => n(h) === n(brief.h1))) out.push({ field: "H1", brief: brief.h1, live: (live.h1 || []).join(" | ") });
  const missing = (brief.schema || []).filter((t) => !["Organization", "ProfessionalService"].includes(t) && !(live.schema || []).includes(t));
  if (missing.length) out.push({ field: "Schema", brief: (brief.schema || []).join(", "), live: (live.schema || []).join(", ") || "none", note: `Missing on the live page: ${missing.join(", ")}` });
  if (live.noindex) out.push({ field: "Robots", brief: "index", live: live.robots });
  if ((live.h1 || []).length > 1) out.push({ field: "H1 count", brief: "1", live: String(live.h1.length) });
  return out;
}

export function absUrl(u) {
  return /^https?:/i.test(u || "") ? u : siteUrl() + (u || "/");
}

export async function auditPage(page, { userId = null, alert = true } = {}) {
  const url = absUrl(page.url);
  let status = 0, data = null, error = "";
  try {
    const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "PremierVisibility/1.0 (+seo-audit)" } });
    status = r.status;
    const html = await r.text();
    if (/There has been a critical error/.test(html)) { error = "WordPress critical error"; status = status < 500 ? 500 : status; }
    data = extract(html, r.url || url, Object.fromEntries(r.headers));
    data.finalUrl = r.url || url;
  } catch (e) {
    error = e.name === "TimeoutError" ? "No response within 20s" : (e.cause?.code || e.message);
  }
  data = data || {};
  if (error) data.error = error;
  const hash = createHash("sha256").update(JSON.stringify({ status, ...data, finalUrl: undefined })).digest("hex").slice(0, 16);
  const prev = await one("SELECT status,data,hash FROM live_snapshots WHERE page_id=$1 ORDER BY fetched_at DESC LIMIT 1", [page.id]);
  if (prev && prev.hash === hash) {
    await q("UPDATE live_snapshots SET fetched_at=now() WHERE id=(SELECT id FROM live_snapshots WHERE page_id=$1 ORDER BY fetched_at DESC LIMIT 1)", [page.id]);
    return { status, data, changes: [], unchanged: true };
  }
  await q("INSERT INTO live_snapshots (page_id,url,status,data,hash) VALUES ($1,$2,$3,$4,$5)", [page.id, url, status, JSON.stringify(data), hash]);
  const changes = prev ? diffSnapshots(prev.data, data, prev.status, status) : [];
  if (!prev) {
    await logEvent({ kind: "live", page_id: page.id, title: `First live snapshot of ${page.name} (HTTP ${status || "no response"})`, detail: { url }, user_id: userId });
  } else if (changes.length) {
    const sev = changes.some((c) => c.severity === "critical") ? "critical" : changes.some((c) => c.severity === "warn") ? "warn" : changes.every((c) => c.severity === "good") ? "good" : "info";
    await logEvent({ kind: "live", severity: sev, page_id: page.id, title: `${page.name}: ${changes.map((c) => c.label).join(", ")} changed on the live page`, detail: { url, changes }, user_id: userId });
    if (alert && sev === "critical") {
      await notify({ severity: "critical", subject: `SEO regression on ${page.name}`, text: `${url}\n` + changes.filter((c) => c.severity === "critical").map((c) => `• ${c.label}: ${fmt(c.before)} → ${fmt(c.after)}`).join("\n") });
    }
  }
  return { status, data, changes };
}
const fmt = (v) => (Array.isArray(v) ? v.join(", ") : v === "" || v == null ? "(empty)" : String(v)).slice(0, 160);

export async function auditAll({ userId = null } = {}) {
  const pages = await q("SELECT id,name,url FROM pages WHERE NOT archived ORDER BY id");
  const out = [];
  for (let i = 0; i < pages.length; i += 4) {
    const batch = pages.slice(i, i + 4);
    out.push(...await Promise.all(batch.map((p) => auditPage(p, { userId }).then((r) => ({ id: p.id, status: r.status, changes: r.changes.length })))));
  }
  return out;
}
