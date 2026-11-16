// Live-page SEO snapshot with HTMLRewriter (streaming, low CPU): what search and answer engines see.
import { q, one, run, iso, j, dj, logEvent, siteUrl } from "./util.js";
import { notify } from "./notify.js";
import { noCache } from "./monitor.js";

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();

export async function extractSeo(html, pageUrl, headers) {
  const host = new URL(pageUrl).hostname;
  const d = { title: "", metaDesc: "", robots: "", canonical: "", h1: [], h2: [], ogTitle: "", ogImage: "", schema: new Set(), schemaInvalid: 0,
    hreflang: [], lang: "", words: 0, internalLinks: 0, externalLinks: 0, images: 0, imagesNoAlt: 0 };
  let inHead = true, cur = null, ld = null, skipDepth = 0;
  const countWords = (t) => { const m = t.match(/[\p{L}\p{N}'’-]+/gu); return m ? m.length : 0; };
  const walk = (n) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === "object") { const t = n["@type"]; (Array.isArray(t) ? t : t ? [t] : []).forEach((x) => d.schema.add(String(x))); Object.values(n).forEach(walk); }
  };
  const skipper = { element(e) { skipDepth++; e.onEndTag(() => { skipDepth--; }); } };
  const heading = { element(e) { const box = { tag: e.tagName.toLowerCase(), text: "" }; cur = box; e.onEndTag(() => { const t = clean(box.text); if (t) d[box.tag].push(t); cur = null; }); }, text(t) { if (cur) cur.text += t.text; } };
  const rw = new HTMLRewriter()
    .on("html", { element(e) { d.lang = e.getAttribute("lang") || ""; } })
    .on("head > title", { text(t) { d.title += t.text; } })
    .on("meta", { element(e) {
      const name = (e.getAttribute("name") || "").toLowerCase(), prop = (e.getAttribute("property") || "").toLowerCase(), c = e.getAttribute("content") || "";
      if (name === "description") d.metaDesc = c; else if (name === "robots") d.robots = c;
      else if (prop === "og:title") d.ogTitle = c; else if (prop === "og:image") d.ogImage = c;
    } })
    .on("link", { element(e) {
      const rel = (e.getAttribute("rel") || "").toLowerCase().split(/\s+/);
      if (rel.includes("canonical")) d.canonical = e.getAttribute("href") || "";
      const hl = e.getAttribute("hreflang"); if (hl) d.hreflang.push(hl);
    } })
    .on('script[type="application/ld+json"]', { element(e) { ld = { text: "" }; const box = ld; e.onEndTag(() => { try { walk(JSON.parse(box.text.trim())); } catch { d.schemaInvalid++; } }); }, text(t) { if (ld) ld.text += t.text; } })
    .on("body", { element() { inHead = false; } })
    .on("body script", skipper).on("body style", skipper).on("body noscript", skipper)
    .on("h1", heading).on("h2", heading)
    .on("body a[href]", { element(e) {
      const href = e.getAttribute("href") || "";
      if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return;
      try { new URL(href, pageUrl).hostname === host ? d.internalLinks++ : d.externalLinks++; } catch {}
    } })
    .on("body img", { element(e) { d.images++; if (!clean(e.getAttribute("alt"))) d.imagesNoAlt++; } })
    .onDocument({ text(t) { if (!inHead && !skipDepth) d.words += countWords(t.text); } });
  await rw.transform(new Response(html, { headers: { "content-type": "text/html" } })).arrayBuffer();
  const robots = [d.robots, headers.get("x-robots-tag")].filter(Boolean).join(", ");
  return {
    title: clean(d.title), metaDesc: clean(d.metaDesc), robots, noindex: /noindex/i.test(robots), canonical: d.canonical,
    h1: d.h1, h2Count: d.h2.length, h2Questions: d.h2.filter((x) => /\?\s*$/.test(x)).length,
    ogTitle: d.ogTitle, ogImage: d.ogImage, schema: [...d.schema].sort(), schemaInvalid: d.schemaInvalid,
    hreflang: d.hreflang, lang: d.lang, words: d.words,
    internalLinks: d.internalLinks, externalLinks: d.externalLinks, images: d.images, imagesNoAlt: d.imagesNoAlt,
  };
}

const WATCH = [["title", "Title", "warn"], ["metaDesc", "Meta description", "warn"], ["canonical", "Canonical URL", "warn"], ["robots", "Robots directives", "warn"],
  ["h1", "H1", "warn"], ["schema", "Schema types", "warn"], ["ogImage", "Social image", "info"], ["lang", "Language", "info"], ["hreflang", "hreflang", "info"]];

export function diffSnapshots(prev, cur, ps, cs) {
  const c = [];
  if (ps !== cs) c.push({ field: "status", label: "HTTP status", before: ps, after: cs, severity: cs >= 400 || !cs ? "critical" : ps >= 400 || !ps ? "good" : "warn" });
  if (!prev || !cur) return c;
  for (const [k, label, sev] of WATCH) if (j(prev[k] ?? "") !== j(cur[k] ?? "")) c.push({ field: k, label, before: prev[k] ?? "", after: cur[k] ?? "", severity: sev });
  if (!prev.noindex && cur.noindex) c.push({ field: "noindex", label: "Page is now set to noindex", before: false, after: true, severity: "critical" });
  if (prev.title && !cur.title) c.push({ field: "titleMissing", label: "Title tag removed", before: prev.title, after: "", severity: "critical" });
  const lost = (prev.schema || []).filter((t) => !(cur.schema || []).includes(t));
  if (lost.length) c.push({ field: "schemaLost", label: `Schema removed: ${lost.join(", ")}`, before: prev.schema, after: cur.schema, severity: "warn" });
  if (prev.words && cur.words < prev.words * 0.7) c.push({ field: "words", label: `Word count dropped ${prev.words} → ${cur.words}`, before: prev.words, after: cur.words, severity: "warn" });
  return c;
}

export function driftFromBrief(live, brief) {
  const n = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const out = [];
  if (brief.seoTitle && n(live.title) !== n(brief.seoTitle)) out.push({ field: "Title", brief: brief.seoTitle, live: live.title });
  if (brief.metaDesc && n(live.metaDesc) !== n(brief.metaDesc)) out.push({ field: "Meta description", brief: brief.metaDesc, live: live.metaDesc });
  if (brief.h1 && !(live.h1 || []).some((h) => n(h) === n(brief.h1))) out.push({ field: "H1", brief: brief.h1, live: (live.h1 || []).join(" | ") });
  const missing = (brief.schema || []).filter((t) => !["Organization", "ProfessionalService"].includes(t) && !(live.schema || []).includes(t));
  if (missing.length) out.push({ field: "Schema", brief: brief.schema.join(", "), live: (live.schema || []).join(", ") || "none", note: `Missing on the live page: ${missing.join(", ")}` });
  if (live.noindex) out.push({ field: "Robots", brief: "index", live: live.robots });
  if ((live.h1 || []).length > 1) out.push({ field: "H1 count", brief: "1", live: String(live.h1.length) });
  return out;
}

export const absUrl = (env, u) => (/^https?:/i.test(u || "") ? u : siteUrl(env) + (u || "/"));
const fmt = (v) => (Array.isArray(v) ? v.join(", ") : v === "" || v == null ? "(empty)" : String(v)).slice(0, 160);

async function sha(text) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(b)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function auditPage(env, page, { userId = null, alert = true } = {}) {
  const url = absUrl(env, page.url);
  let status = 0, data = {}, error = "";
  try {
    const r = await fetch(noCache(url), { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "PremierVisibility/1.0 (+seo-audit)", "cache-control": "no-cache" } });
    status = r.status;
    const html = await r.text();
    if (html.includes("There has been a critical error")) { error = "WordPress critical error"; status = Math.max(status, 500); }
    data = await extractSeo(html, r.url || url, r.headers);
    data.finalUrl = (r.url || url).replace(/[?&]pv_nocache=\d+/, "");
  } catch (e) { error = e.name === "TimeoutError" ? "No response within 20s" : (e.message || String(e)); }
  if (error) data.error = error;
  const { finalUrl, ...hashable } = data;
  const hash = await sha(j({ status, ...hashable }));
  const now = iso();
  const prev = await one(env, "SELECT id,status,data,hash FROM live_snapshots WHERE page_id=? ORDER BY fetched_at DESC, id DESC LIMIT 1", page.id);
  if (prev && prev.hash === hash) {
    await env.DB.batch([env.DB.prepare("UPDATE live_snapshots SET fetched_at=? WHERE id=?").bind(now, prev.id), env.DB.prepare("UPDATE pages SET last_audit=? WHERE id=?").bind(now, page.id)]);
    return { status, data, changes: [], unchanged: true };
  }
  await env.DB.batch([
    env.DB.prepare("INSERT INTO live_snapshots (page_id,url,fetched_at,status,data,hash) VALUES (?,?,?,?,?,?)").bind(page.id, url, now, status, j(data), hash),
    env.DB.prepare("UPDATE pages SET last_audit=? WHERE id=?").bind(now, page.id),
  ]);
  const changes = prev ? diffSnapshots(dj(prev.data), data, prev.status, status) : [];
  if (!prev) {
    await logEvent(env, { kind: "live", page_id: page.id, user_id: userId, severity: status >= 400 || !status ? "warn" : "info", title: `First live snapshot of ${page.name} (HTTP ${status || "no response"})`, detail: { url } });
  } else if (changes.length) {
    const sevs = changes.map((c) => c.severity);
    const sev = sevs.includes("critical") ? "critical" : sevs.includes("warn") ? "warn" : sevs.every((s) => s === "good") ? "good" : "info";
    await logEvent(env, { kind: "live", page_id: page.id, user_id: userId, severity: sev, title: `${page.name}: ${changes.map((c) => c.label).join(", ")} changed on the live page`, detail: { url, changes } });
    if (alert && sev === "critical") await notify(env, { severity: "critical", subject: `SEO regression on ${page.name}`, text: `${url}\n` + changes.filter((c) => c.severity === "critical").map((c) => `• ${c.label}: ${fmt(c.before)} → ${fmt(c.after)}`).join("\n") });
  }
  return { status, data, changes };
}

// Audits the pages whose last audit is oldest, a few at a time (keeps each run inside the free plan's CPU limit).
export async function auditDue(env, { limit = 1, maxAgeMs = 864e5, userId = null } = {}) {
  const cutoff = iso(-maxAgeMs);
  const due = (await q(env, "SELECT id,name,url,brief FROM pages WHERE archived=0 AND (last_audit IS NULL OR last_audit < ?) ORDER BY COALESCE(last_audit,'') LIMIT 40", cutoff))
    .filter((p) => !dj(p.brief)?.noLive);
  const batch = due.slice(0, limit);
  const out = [];
  for (const p of batch) { const r = await auditPage(env, p, { userId }); out.push({ id: p.id, status: r.status, changes: r.changes.length }); }
  return { audited: out, remaining: Math.max(0, due.length - batch.length) };
}
