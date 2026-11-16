// JSON API (/api/*). Same routes and response shapes as before, so the front end barely changes.
import { q, one, run, iso, j, dj, shape, HttpError, need, str, siteUrl, getSetting, setSetting, logEvent, fmtMins, splitList, ensureSeed } from "./util.js";
import { currentUser, canEdit, isAdmin } from "./auth.js";
import { runMonitor, runAllMonitors, pruneChecks } from "./monitor.js";
import { auditPage, auditDue, driftFromBrief } from "./audit.js";
import { refreshWp } from "./wp.js";
import { notify } from "./notify.js";
import PLAYBOOK from "./playbook.md";

const FIELD_LABELS = { name: "Page name", url: "URL", type: "Page type", status: "Status", owner: "Owner", intent: "Search intent", markets: "Target markets",
  primary: "Primary keyword", volume: "Search volume", competitor: "Competitor", secondary: "Secondary keywords", questions: "Questions", entities: "Entities",
  seoTitle: "SEO title", metaDesc: "Meta description", ogImage: "OG image", ogAlt: "OG image alt", h1: "H1", answer: "Direct answer", outline: "Outline", body: "Body copy",
  faqs: "FAQs", takeaways: "Key takeaways", proof: "Stats and sources", author: "Author", creds: "Author credentials", reviewer: "Reviewer", reviewed: "Last reviewed",
  internal: "Internal links", external: "External sources", images: "Images", schema: "Schema types", tech: "Technical checklist" };
const PAGE_TYPES = ["home", "service", "about", "profile", "hub", "article", "event", "faq", "contact", "legal"];

const routes = [];
const route = (method, pattern, auth, fn) => {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "/?$");
  routes.push({ method, re, keys, auth, fn });
};

export async function handleApi(req, env, ctx) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const r = routes.find((x) => x.method === req.method && x.re.test(path));
  if (!r) return json(404, { error: "Not found" });
  const m = path.match(r.re);
  const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
  try {
    await ensureSeed(env);
    const user = await currentUser(req, env);
    need(user, 401, "Sign in through Cloudflare Access to continue.");
    if (r.auth === "edit") need(canEdit(user), 403, "Your account can view but not edit.");
    if (r.auth === "admin") need(isAdmin(user), 403, "Only admins can do this.");
    if (req.method !== "GET") {
      const origin = req.headers.get("origin");
      if (origin) need(new URL(origin).host === url.host, 403, "Cross-site request blocked.");
    }
    let body = {};
    if (req.method !== "GET") { const t = await req.text(); need(t.length < 1e6, 413, "Request too large"); body = t ? JSON.parse(t) : {}; }
    const out = await r.fn({ params, body, user, env, ctx, url });
    if (out && out.__status) { const { __status, ...rest } = out; return json(__status, rest); }
    return json(200, out ?? { ok: true });
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message });
    if (e instanceof SyntaxError) return json(400, { error: "That request wasn't valid JSON." });
    console.error(e);
    return json(500, { error: "Something went wrong on the server. Check the Worker logs in Cloudflare." });
  }
}
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });

/* ---------- account ---------- */
route("GET", "/me", "user", async ({ user, env }) => {
  await run(env, "UPDATE users SET last_seen=? WHERE id=?", iso(), user.id);
  return { user, site: siteUrl(env), logoutUrl: "/cdn-cgi/access/logout" };
});

/* ---------- dashboard ---------- */
route("GET", "/dashboard", "user", async ({ env }) => {
  const pages = await pagesWithLive(env);
  const versions = await q(env, "SELECT pv.page_id, pv.score, pv.created_at FROM page_versions pv JOIN pages p ON p.id=pv.page_id WHERE p.archived=0 ORDER BY pv.created_at, pv.id");
  const wp = await one(env, "SELECT at,data FROM wp_snapshots ORDER BY at DESC, id DESC LIMIT 1");
  const wd = wp ? dj(wp.data) : null;
  return {
    pages, trend: scoreTrend(pages.map((p) => p.id), versions, 90), monitors: await uptimeStats(env, 30),
    openIncidents: shape(await q(env, "SELECT i.*, m.name FROM incidents i JOIN monitors m ON m.id=i.monitor_id WHERE i.resolved_at IS NULL ORDER BY i.started_at DESC, i.id DESC"), [], ["in_window"]),
    incidents30: (await one(env, "SELECT COUNT(*) AS n FROM incidents WHERE started_at >= ? AND in_window=0", iso(-30 * 864e5))).n,
    events: shape(await q(env, "SELECT e.*, u.name AS user_name FROM events e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.at DESC, e.id DESC LIMIT 12"), ["detail"]),
    wp: wd ? { at: wp.at, core: wd.core, php: wd.php, pending: (wd.plugins || []).filter((p) => p.update).length, plugins: (wd.plugins || []).length, themeUpdate: wd.theme?.update || null } : null,
    nextWindow: await one(env, "SELECT * FROM maintenance WHERE kind='window' AND (ends_at IS NULL OR ends_at >= ?) ORDER BY starts_at LIMIT 1", iso()),
  };
});

export function scoreTrend(ids, versions, days) {
  const out = [], latest = new Map(); let i = 0;
  const start = new Date(); start.setUTCHours(23, 59, 59, 0); start.setUTCDate(start.getUTCDate() - days + 1);
  for (let d = 0; d < days; d++) {
    const end = new Date(start); end.setUTCDate(start.getUTCDate() + d);
    const endIso = end.toISOString().replace(/\.\d{3}Z$/, "Z");
    for (; i < versions.length && versions[i].created_at <= endIso; i++) latest.set(versions[i].page_id, versions[i].score);
    const vals = ids.map((id) => latest.get(id)).filter((v) => v != null);
    out.push({ day: endIso.slice(0, 10), avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null });
  }
  return out;
}

/* ---------- pages ---------- */
export async function pagesWithLive(env) {
  const pages = await q(env, "SELECT p.id,p.name,p.url,p.type,p.score,p.fails,p.version,p.updated_at,p.brief,p.last_audit,u.name AS updated_by_name FROM pages p LEFT JOIN users u ON u.id=p.updated_by WHERE p.archived=0 ORDER BY p.name");
  const live = new Map((await q(env, "SELECT ls.page_id, ls.status, ls.data, ls.fetched_at FROM live_snapshots ls JOIN (SELECT page_id, MAX(fetched_at) AS mf FROM live_snapshots GROUP BY page_id) x ON x.page_id=ls.page_id AND x.mf=ls.fetched_at")).map((l) => [l.page_id, l]));
  return pages.map(({ brief, ...p }) => {
    const b = dj(brief) || {}, l = live.get(p.id);
    return { ...p, status: b.status || "Not started", primary: b.primary || "", owner: b.owner || "", no_live: !!b.noLive,
      live_status: l ? l.status : null, live_at: l?.fetched_at || null, live_noindex: l ? !!dj(l.data)?.noindex : null };
  });
}
route("GET", "/pages", "user", ({ env }) => pagesWithLive(env));
route("GET", "/pages/:id", "user", async ({ env, params }) => {
  const p = await one(env, "SELECT p.*, u.name AS updated_by_name FROM pages p LEFT JOIN users u ON u.id=p.updated_by WHERE p.id=?", params.id);
  need(p, 404, "No page with that id.");
  const page = shape([p], ["brief"], ["archived"])[0];
  const live = await one(env, "SELECT status,data,fetched_at,url FROM live_snapshots WHERE page_id=? ORDER BY fetched_at DESC, id DESC LIMIT 1", p.id);
  if (live) live.data = dj(live.data);
  return { page, live, drift: live && !live.data?.error ? driftFromBrief(live.data, page.brief) : [], history: await q(env, "SELECT version,score,created_at FROM page_versions WHERE page_id=? ORDER BY version", p.id) };
});
route("PUT", "/pages/:id", "edit", ({ env, params, body, user }) => saveBrief(env, params.id, body.brief, Number(body.baseVersion ?? -1), str(body.note, 300), user, Number(body.score) || 0, Number(body.fails) || 0));

async function saveBrief(env, id, brief, base, note, user, score, fails, restoredFrom = null) {
  const p = await one(env, "SELECT * FROM pages WHERE id=?", id);
  need(p, 404, "No page with that id.");
  need(brief && typeof brief === "object" && !Array.isArray(brief), 400, "Missing brief.");
  need(j(brief).length < 240000, 413, "This brief is too large to save. Shorten the body copy.");
  if (p.version !== base) {
    const who = p.updated_by ? await one(env, "SELECT name FROM users WHERE id=?", p.updated_by) : null;
    return { __status: 409, error: `${who?.name || "Someone"} saved this page while you were editing. Reload to see their version, then re-apply your changes.`, current: p.version };
  }
  const old = dj(p.brief) || {};
  brief = { ...brief, id, updatedAt: Date.now(), name: str(brief.name, 120) || p.name, url: str(brief.url, 300) || p.url };
  const type = PAGE_TYPES.includes(brief.type) ? brief.type : p.type;
  const skip = new Set(["updatedAt", "id", "custom", "noLive"]);
  const changed = [...new Set([...Object.keys(old), ...Object.keys(brief)])].filter((k) => !skip.has(k) && j(old[k] ?? "") !== j(brief[k] ?? ""));
  if (!changed.length) return { page: shape([p], ["brief"])[0], unchanged: true };
  score = Math.max(0, Math.min(100, Math.round(score))); fails = Math.max(0, Math.round(fails));
  const v = p.version + 1, now = iso();
  const res = await run(env, "UPDATE pages SET brief=?, name=?, url=?, type=?, score=?, fails=?, version=?, updated_at=?, updated_by=? WHERE id=? AND version=?",
    j(brief), brief.name, brief.url, type, score, fails, v, now, user.id, id, p.version);
  if (!res.meta.changes) return { __status: 409, error: "Someone saved this page at the same moment. Reload and try again." };
  const noteOut = restoredFrom != null ? `Restored version ${restoredFrom}${note ? ": " + note : ""}` : note;
  await run(env, "INSERT INTO page_versions (page_id,version,brief,score,fails,changed,note,user_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)", id, v, j(brief), score, fails, j(changed), noteOut, user.id, now);
  const delta = score - p.score, labels = changed.map((k) => FIELD_LABELS[k] || k);
  await logEvent(env, { kind: "brief", page_id: id, user_id: user.id, severity: delta <= -10 ? "warn" : delta > 0 ? "good" : "info",
    title: `${user.name} ${restoredFrom != null ? `restored version ${restoredFrom} of` : "updated"} ${brief.name}: ${labels.slice(0, 4).join(", ")}${labels.length > 4 ? ` +${labels.length - 4} more` : ""} (score ${p.score}% → ${score}%)`,
    detail: { version: v, changed, from: p.score, to: score, note } });
  return { page: shape([await one(env, "SELECT * FROM pages WHERE id=?", id)], ["brief"])[0] };
}

route("POST", "/pages", "edit", async ({ env, body, user }) => {
  const name = str(body.name, 120); need(name, 400, "Give the page a name.");
  const type = PAGE_TYPES.includes(body.type) ? body.type : "article";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "page";
  let id = `c-${slug}`, n = 2;
  while (await one(env, "SELECT id FROM pages WHERE id=?", id)) id = `c-${slug}-${n++}`;
  const url = str(body.url, 300) || (type === "article" ? `/resources/${slug}/` : `/${slug}/`);
  const brief = { ...(body.brief && typeof body.brief === "object" ? body.brief : {}), id, name, url, type, custom: true };
  const score = Math.max(0, Math.min(100, Number(body.score) || 0)), fails = Math.max(0, Number(body.fails) || 0), now = iso();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO pages (id,name,url,type,brief,score,fails,version,archived,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,0,0,?,?)").bind(id, name, url, type, j(brief), score, fails, now, user.id),
    env.DB.prepare("INSERT INTO page_versions (page_id,version,brief,score,fails,changed,note,user_id,created_at) VALUES (?,0,?,?,?,'[]','Page added',?,?)").bind(id, j(brief), score, fails, user.id, now),
  ]);
  await logEvent(env, { kind: "brief", page_id: id, user_id: user.id, title: `${user.name} added the page ${name}` });
  return { id };
});
route("POST", "/pages/:id/archive", "admin", async ({ env, params, user }) => {
  const p = await one(env, "SELECT name FROM pages WHERE id=?", params.id); need(p, 404, "No page with that id.");
  await run(env, "UPDATE pages SET archived=1 WHERE id=?", params.id);
  await logEvent(env, { kind: "brief", page_id: params.id, user_id: user.id, title: `${user.name} archived ${p.name}` });
  return { ok: true };
});
route("GET", "/pages/:id/versions", "user", async ({ env, params }) => shape(await q(env, "SELECT v.version,v.score,v.fails,v.changed,v.note,v.created_at,u.name AS user_name FROM page_versions v LEFT JOIN users u ON u.id=v.user_id WHERE v.page_id=? ORDER BY v.version DESC", params.id), ["changed"]));
route("GET", "/pages/:id/versions/:v", "user", async ({ env, params }) => {
  const v = Number(params.v);
  const cur = await one(env, "SELECT v.*, u.name AS user_name FROM page_versions v LEFT JOIN users u ON u.id=v.user_id WHERE v.page_id=? AND v.version=?", params.id, v);
  need(cur, 404, "No such version.");
  const prev = await one(env, "SELECT version,brief,score FROM page_versions WHERE page_id=? AND version<? ORDER BY version DESC LIMIT 1", params.id, v);
  return { version: shape([cur], ["brief", "changed"])[0], previous: prev ? shape([prev], ["brief"])[0] : null };
});
route("POST", "/pages/:id/restore", "edit", async ({ env, params, body, user }) => {
  const v = await one(env, "SELECT brief,score,fails FROM page_versions WHERE page_id=? AND version=?", params.id, Number(body.version));
  need(v, 404, "No such version.");
  const cur = await one(env, "SELECT version FROM pages WHERE id=?", params.id);
  return saveBrief(env, params.id, dj(v.brief), cur.version, "", user, v.score, v.fails, Number(body.version));
});
route("POST", "/pages/:id/audit", "edit", async ({ env, params, user }) => {
  const p = await one(env, "SELECT id,name,url,brief FROM pages WHERE id=?", params.id); need(p, 404, "No page with that id.");
  const r = await auditPage(env, p, { userId: user.id });
  return { ...r, drift: !r.data.error ? driftFromBrief(r.data, dj(p.brief)) : [] };
});
route("GET", "/pages/:id/live", "user", async ({ env, params }) => shape(await q(env, "SELECT id,status,data,fetched_at,url FROM live_snapshots WHERE page_id=? ORDER BY fetched_at DESC, id DESC LIMIT 40", params.id), ["data"]));

/* ---------- activity ---------- */
route("GET", "/events", "user", async ({ env }) => shape(await q(env, "SELECT e.*, u.name AS user_name, p.name AS page_name FROM events e LEFT JOIN users u ON u.id=e.user_id LEFT JOIN pages p ON p.id=e.page_id ORDER BY e.at DESC, e.id DESC LIMIT 400"), ["detail"]));

/* ---------- uptime ---------- */
export async function uptimeStats(env, days) {
  const monitors = shape(await q(env, "SELECT * FROM monitors ORDER BY id"), [], ["active"]);
  const since = iso(-(days - 1) * 864e5).slice(0, 10);
  const rows = await q(env, "SELECT monitor_id, day, total, ok, ms_sum FROM check_days WHERE day >= ?", since);
  const recent = await q(env, "SELECT monitor_id, SUM(CASE WHEN at >= ? THEN 1 ELSE 0 END) AS t1, SUM(CASE WHEN at >= ? AND ok=1 THEN 1 ELSE 0 END) AS o1, AVG(CASE WHEN at >= ? THEN ms END) AS ms1 FROM checks WHERE at >= ? GROUP BY monitor_id",
    iso(-864e5), iso(-864e5), iso(-864e5), iso(-864e5));
  const pct = (o, t) => (t ? Math.round((o / t) * 10000) / 100 : null);
  return monitors.map((m) => {
    const mine = rows.filter((r) => r.monitor_id === m.id), byDay = new Map(mine.map((r) => [r.day, r]));
    const sum = (n) => { const cut = iso(-(n - 1) * 864e5).slice(0, 10); const s = mine.filter((r) => r.day >= cut); return pct(s.reduce((a, r) => a + r.ok, 0), s.reduce((a, r) => a + r.total, 0)); };
    const w = recent.find((r) => r.monitor_id === m.id) || {};
    const daysArr = [];
    for (let d = days - 1; d >= 0; d--) { const key = iso(-d * 864e5).slice(0, 10), r = byDay.get(key); daysArr.push({ day: key, total: r?.total || 0, ok: r?.ok || 0, ms: r ? Math.round(r.ms_sum / r.total) : null }); }
    return { ...m, up24: pct(w.o1 || 0, w.t1 || 0), up7: sum(7), up30: sum(30), up90: days >= 90 ? sum(90) : null, ms24: w.ms1 != null ? Math.round(w.ms1) : null, days: daysArr };
  });
}
route("GET", "/uptime", "user", async ({ env }) => {
  const inc = shape(await q(env, "SELECT i.*, m.name, m.url FROM incidents i JOIN monitors m ON m.id=i.monitor_id ORDER BY i.started_at DESC, i.id DESC LIMIT 100"), [], ["in_window"])
    .map((i) => ({ ...i, duration: fmtMins(Math.max(1, Math.round(((i.resolved_at ? Date.parse(i.resolved_at) : Date.now()) - Date.parse(i.started_at)) / 60000))) }));
  return { monitors: await uptimeStats(env, 90), incidents: inc, recent: shape(await q(env, "SELECT monitor_id,at,ok,ms,status,error FROM checks WHERE at >= ? ORDER BY at", iso(-864e5)), [], ["ok"]) };
});
route("POST", "/monitors", "edit", async ({ env, body, user }) => {
  const url = str(body.url); need(/^https?:\/\//.test(url), 400, "Enter a full URL starting with https://");
  const res = await run(env, "INSERT INTO monitors (name,url,must_contain) VALUES (?,?,?)", str(body.name, 80) || url, url, str(body.must_contain, 200));
  const m = await one(env, "SELECT * FROM monitors WHERE id=?", res.meta.last_row_id);
  await logEvent(env, { kind: "uptime", user_id: user.id, title: `${user.name} added the monitor ${m.name}` });
  return m;
});
route("PUT", "/monitors/:id", "edit", async ({ env, params, body }) => {
  const url = str(body.url); need(/^https?:\/\//.test(url), 400, "Enter a full URL starting with https://");
  await run(env, "UPDATE monitors SET name=?, url=?, must_contain=?, active=? WHERE id=?", str(body.name, 80) || url, url, str(body.must_contain, 200), body.active === false ? 0 : 1, Number(params.id));
  return one(env, "SELECT * FROM monitors WHERE id=?", Number(params.id));
});
route("DELETE", "/monitors/:id", "admin", async ({ env, params }) => {
  const id = Number(params.id);
  await env.DB.batch(["DELETE FROM checks WHERE monitor_id=?", "DELETE FROM check_days WHERE monitor_id=?", "DELETE FROM incidents WHERE monitor_id=?", "DELETE FROM monitors WHERE id=?"].map((s) => env.DB.prepare(s).bind(id)));
  return { ok: true };
});
route("POST", "/monitors/:id/check", "edit", async ({ env, params }) => { const m = await one(env, "SELECT * FROM monitors WHERE id=?", Number(params.id)); need(m, 404, "No such monitor."); return runMonitor(env, m); });

/* ---------- maintenance ---------- */
route("GET", "/maintenance", "user", async ({ env }) => shape(await q(env, "SELECT m.*, u.name AS user_name FROM maintenance m LEFT JOIN users u ON u.id=m.user_id ORDER BY m.starts_at DESC, m.id DESC LIMIT 300"), [], ["auto"]));
route("POST", "/maintenance", "edit", async ({ env, body, user }) => {
  const kind = body.kind === "window" ? "window" : "log";
  const title = str(body.title, 160); need(title, 400, "Add a title.");
  const s = body.starts_at ? Date.parse(body.starts_at) : Date.now(), e = body.ends_at ? Date.parse(body.ends_at) : null;
  need(!isNaN(s), 400, "Start time isn't a valid date.");
  need(e === null || (!isNaN(e) && e > s), 400, "The end must be after the start.");
  need(kind === "log" || e, 400, "A maintenance window needs an end time.");
  const f = (t) => new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
  const res = await run(env, "INSERT INTO maintenance (kind,title,notes,category,starts_at,ends_at,user_id,auto,created_at) VALUES (?,?,?,?,?,?,?,0,?)",
    kind, title, str(body.notes, 4000), str(body.category, 40) || "general", f(s), e ? f(e) : null, user.id, iso());
  const m = await one(env, "SELECT * FROM maintenance WHERE id=?", res.meta.last_row_id);
  await logEvent(env, { kind: "maintenance", user_id: user.id, title: kind === "window" ? `${user.name} scheduled maintenance: ${title} (${f(s).slice(0, 16).replace("T", " ")} UTC)` : `${user.name} logged: ${title}` });
  if (kind === "window") await notify(env, { subject: `Maintenance scheduled: ${title}`, text: `From ${new Date(s).toUTCString()} to ${new Date(e).toUTCString()}. Downtime alerts are muted during this window.${m.notes ? "\n\n" + m.notes : ""}` });
  return m;
});
route("DELETE", "/maintenance/:id", "edit", async ({ env, params, user }) => {
  const m = await one(env, "SELECT * FROM maintenance WHERE id=?", Number(params.id)); need(m, 404, "Not found.");
  need(isAdmin(user) || m.user_id === user.id, 403, "Only the person who added it or an admin can delete it.");
  await run(env, "DELETE FROM maintenance WHERE id=?", m.id);
  return { ok: true };
});

/* ---------- WordPress ---------- */
route("GET", "/wp", "user", async ({ env }) => {
  const latest = await one(env, "SELECT at,data FROM wp_snapshots ORDER BY at DESC, id DESC LIMIT 1");
  if (latest) latest.data = dj(latest.data);
  return { configured: !!env.WP_CONNECTOR_KEY, latest, history: shape(await q(env, "SELECT e.*, u.name AS user_name FROM events e LEFT JOIN users u ON u.id=e.user_id WHERE e.kind='plugins' ORDER BY e.at DESC, e.id DESC LIMIT 60"), ["detail"]) };
});
route("POST", "/wp/refresh", "edit", ({ env, user }) => refreshWp(env, user.id));

/* ---------- alerts, settings, team ---------- */
route("GET", "/notifications", "user", async ({ env }) => shape(await q(env, "SELECT * FROM notifications ORDER BY at DESC, id DESC LIMIT 200"), [], ["ok"]));
route("POST", "/notifications/test", "admin", async ({ env, user }) => ({ results: await notify(env, { subject: "Test alert", text: `${user.name} sent a test alert from Premier Visibility. If you can read this, alerts reach you.` }) }));
route("GET", "/settings", "user", async ({ env, user }) => ({
  connectorKey: isAdmin(user) ? env.WP_CONNECTOR_KEY || "" : undefined,
  site: siteUrl(env), appUrl: env.APP_URL || "", alertEmails: (await getSetting(env, "alert_emails", null)) || splitList(env.ALERT_EMAILS),
  channels: { slack: !!env.SLACK_WEBHOOK_URL, email: !!env.RESEND_API_KEY, connector: !!env.WP_CONNECTOR_KEY, access: !!env.ACCESS_AUD },
  lastCron: { uptime: await getSetting(env, "last_uptime_cron", null), daily: await getSetting(env, "last_daily_cron", null) },
}));
route("PUT", "/settings", "admin", async ({ env, body }) => {
  const emails = splitList(body.alertEmails);
  need(emails.every((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)), 400, "One of the alert emails isn't a valid address.");
  await setSetting(env, "alert_emails", emails);
  return { ok: true };
});
route("GET", "/users", "admin", ({ env }) => q(env, "SELECT id,email,name,role,created_at,last_seen FROM users ORDER BY name"));
route("POST", "/users", "admin", async ({ env, body, user }) => {
  const email = str(body.email, 200).toLowerCase(); need(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 400, "Enter a valid email.");
  need(!(await one(env, "SELECT id FROM users WHERE email=?", email)), 400, "That email already has an account.");
  const role = ["admin", "editor", "viewer"].includes(body.role) ? body.role : "editor", name = str(body.name, 80) || email;
  await run(env, "INSERT INTO users (email,name,role,created_at) VALUES (?,?,?,?)", email, name, role, iso());
  await logEvent(env, { kind: "system", user_id: user.id, title: `${user.name} added ${name} as ${role}` });
  return one(env, "SELECT id,email,name,role FROM users WHERE email=?", email);
});
route("PUT", "/users/:id", "admin", async ({ env, params, body, user }) => {
  const id = Number(params.id);
  need(["admin", "editor", "viewer"].includes(body.role), 400, "Unknown role.");
  need(id !== user.id || body.role === "admin", 400, "You can't remove your own admin role.");
  await run(env, "UPDATE users SET role=? WHERE id=?", body.role, id);
  return { ok: true };
});
route("DELETE", "/users/:id", "admin", async ({ env, params, user }) => {
  const id = Number(params.id); need(id !== user.id, 400, "You can't remove your own account.");
  await env.DB.batch(["UPDATE pages SET updated_by=NULL WHERE updated_by=?", "UPDATE page_versions SET user_id=NULL WHERE user_id=?", "UPDATE events SET user_id=NULL WHERE user_id=?", "UPDATE maintenance SET user_id=NULL WHERE user_id=?", "DELETE FROM users WHERE id=?"].map((s) => env.DB.prepare(s).bind(id)));
  return { ok: true };
});
route("GET", "/export", "admin", async ({ env }) => ({ exportedAt: iso(), pages: shape(await q(env, "SELECT * FROM pages"), ["brief"]), versions: shape(await q(env, "SELECT * FROM page_versions ORDER BY page_id, version"), ["brief", "changed"]),
  maintenance: await q(env, "SELECT * FROM maintenance"), incidents: await q(env, "SELECT * FROM incidents") }));
route("GET", "/playbook", "user", () => ({ markdown: PLAYBOOK }));

/* ---------- on-demand jobs (small batches keep each request inside the free plan's CPU limit) ---------- */
route("POST", "/run/audit", "edit", ({ env, user }) => auditDue(env, { limit: 2, maxAgeMs: 10 * 60e3, userId: user.id }));
route("POST", "/run/daily", "admin", ({ env }) => jobDaily(env));

export async function jobUptime(env) {
  const checks = await runAllMonitors(env);
  const audit = await auditDue(env, { limit: 1 });
  await setSetting(env, "last_uptime_cron", iso());
  return { checks, audit };
}
export async function jobDaily(env) {
  const out = {};
  try { const r = await refreshWp(env); out.wp = r.error ? { error: r.error } : { plugins: (r.data.plugins || []).length }; } catch (e) { out.wp = { error: e.message }; }
  try { await pruneChecks(env); out.prune = true; } catch (e) { out.prune = { error: e.message }; }
  await setSetting(env, "last_daily_cron", iso());
  return out;
}
