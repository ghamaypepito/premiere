// JSON API for Premier Visibility. Every route lives here; api/index.js and dev.js only adapt the request.
import { q, one, logEvent, getSetting, setSetting, siteUrl } from "./db.js";
import { currentUser, login, sessionCookie, clearCookie, canEdit, isAdmin, hashPassword, checkPassword } from "./auth.js";
import { runAllMonitors, runMonitor, checkSsl, pruneChecks, fmtMins } from "./monitor.js";
import { auditPage, auditAll, driftFromBrief } from "./audit.js";
import { refreshWp } from "./wp.js";
import { notify, splitList } from "./notify.js";
import { evaluate, scoreOf, blank, TEMPL, FIELD_LABELS, changedFields } from "../public/js/rules.js";

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const need = (cond, status, msg) => { if (!cond) throw new HttpError(status, msg); };
const str = (v, max = 500) => String(v ?? "").trim().slice(0, max);

const routes = [];
const route = (method, pattern, opts, fn) => {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "/?$");
  routes.push({ method, re, keys, fn, auth: opts.auth ?? "user" });
};

export async function handle({ method, path, body, headers, secure }) {
  const req = { headers };
  const r = routes.find((x) => x.method === method && x.re.test(path));
  if (!r) return { status: 404, body: { error: "Not found" } };
  const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(path.match(r.re)[i + 1])]));
  try {
    let user = null;
    if (r.auth === "cron") {
      const secret = process.env.CRON_SECRET;
      const ok = secret ? headers.authorization === `Bearer ${secret}` : !(process.env.VERCEL || process.env.NODE_ENV === "production");
      need(ok, 401, "Invalid cron secret");
    } else if (r.auth !== "public") {
      user = await currentUser(req);
      need(user, 401, "Sign in to continue.");
      if (r.auth === "edit") need(canEdit(user), 403, "Your account can view but not edit.");
      if (r.auth === "admin") need(isAdmin(user), 403, "Only admins can do this.");
    }
    if (method !== "GET" && r.auth !== "cron") {
      const origin = headers.origin;
      if (origin) { try { need(new URL(origin).host === headers.host, 403, "Cross-site request blocked."); } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(403, "Bad origin"); } }
    }
    const out = await r.fn({ params, body: body || {}, user, secure });
    return out && out.__raw ? out.__raw : { status: 200, body: out ?? { ok: true } };
  } catch (e) {
    if (e instanceof HttpError) return { status: e.status, body: { error: e.message } };
    console.error(e);
    return { status: 500, body: { error: "Something went wrong on the server. Check the function logs." } };
  }
}

/* ---------- auth ---------- */
route("POST", "/login", { auth: "public" }, async ({ body, secure }) => {
  const res = await login(body.email, body.password);
  if (res.error) return { __raw: { status: 401, body: { error: res.error } } };
  return { __raw: { status: 200, body: { user: res.user }, headers: { "set-cookie": sessionCookie(res.user.id, secure) } } };
});
route("POST", "/logout", { auth: "public" }, async ({ secure }) => ({ __raw: { status: 200, body: { ok: true }, headers: { "set-cookie": clearCookie(secure) } } }));
route("GET", "/me", {}, async ({ user }) => ({ user, site: siteUrl() }));
route("PUT", "/me/password", {}, async ({ user, body }) => {
  const u = await one("SELECT pass_hash FROM users WHERE id=$1", [user.id]);
  need(checkPassword(String(body.current || ""), u.pass_hash), 400, "Your current password is wrong.");
  need(String(body.next || "").length >= 10, 400, "Use at least 10 characters.");
  await q("UPDATE users SET pass_hash=$2 WHERE id=$1", [user.id, hashPassword(String(body.next))]);
  return { ok: true };
});

/* ---------- dashboard ---------- */
route("GET", "/dashboard", {}, async () => {
  const pages = await q(`SELECT p.id,p.name,p.url,p.type,p.score,p.fails,p.version,p.updated_at,p.brief->>'status' AS status,p.brief->>'primary' AS primary,
      ls.status AS live_status, ls.data->>'noindex' AS live_noindex, ls.fetched_at AS live_at
    FROM pages p LEFT JOIN LATERAL (SELECT status,data,fetched_at FROM live_snapshots WHERE page_id=p.id ORDER BY fetched_at DESC LIMIT 1) ls ON true
    WHERE NOT p.archived ORDER BY p.score DESC`);
  const versions = await q("SELECT pv.page_id,pv.score,pv.created_at FROM page_versions pv JOIN pages p ON p.id=pv.page_id WHERE NOT p.archived ORDER BY pv.created_at");
  const monitors = await uptimeStats(30);
  const openIncidents = await q("SELECT i.*,m.name FROM incidents i JOIN monitors m ON m.id=i.monitor_id WHERE resolved_at IS NULL ORDER BY started_at DESC");
  const events = await q("SELECT e.*,u.name AS user_name FROM events e LEFT JOIN users u ON u.id=e.user_id ORDER BY at DESC LIMIT 12");
  const wp = await one("SELECT at,data FROM wp_snapshots ORDER BY at DESC LIMIT 1");
  const nextWindow = await one("SELECT * FROM maintenance WHERE kind='window' AND (ends_at IS NULL OR ends_at >= now()) ORDER BY starts_at LIMIT 1");
  return {
    pages, trend: scoreTrend(pages.map((p) => p.id), versions, 90), monitors, openIncidents, events,
    ssl: await getSetting("ssl", null),
    wp: wp ? { at: wp.at, core: wp.data.core, php: wp.data.php, pending: (wp.data.plugins || []).filter((p) => p.update).length, plugins: (wp.data.plugins || []).length, themeUpdate: wp.data.theme?.update || null } : null,
    nextWindow,
  };
});

// Daily site-wide average brief score, carrying each page's latest score forward.
function scoreTrend(ids, versions, days) {
  const out = [], latest = new Map(); let i = 0;
  const start = new Date(); start.setUTCHours(23, 59, 59, 999); start.setUTCDate(start.getUTCDate() - days + 1);
  for (; i < versions.length && new Date(versions[i].created_at) <= start; i++) latest.set(versions[i].page_id, versions[i].score);
  for (let d = 0; d < days; d++) {
    const end = new Date(start); end.setUTCDate(start.getUTCDate() + d);
    for (; i < versions.length && new Date(versions[i].created_at) <= end; i++) latest.set(versions[i].page_id, versions[i].score);
    const vals = ids.map((id) => latest.get(id)).filter((v) => v != null);
    out.push({ day: end.toISOString().slice(0, 10), avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null });
  }
  return out;
}

/* ---------- pages ---------- */
route("GET", "/pages", {}, async () => q(`SELECT p.id,p.name,p.url,p.type,p.score,p.fails,p.version,p.updated_at,u.name AS updated_by_name,
    p.brief->>'status' AS status, p.brief->>'primary' AS primary, p.brief->>'owner' AS owner,
    ls.status AS live_status, ls.fetched_at AS live_at, (ls.data->>'noindex')::boolean AS live_noindex
  FROM pages p LEFT JOIN users u ON u.id=p.updated_by
  LEFT JOIN LATERAL (SELECT status,data,fetched_at FROM live_snapshots WHERE page_id=p.id ORDER BY fetched_at DESC LIMIT 1) ls ON true
  WHERE NOT p.archived ORDER BY p.name`));

route("GET", "/pages/:id", {}, async ({ params }) => {
  const p = await one("SELECT p.*,u.name AS updated_by_name FROM pages p LEFT JOIN users u ON u.id=p.updated_by WHERE p.id=$1", [params.id]);
  need(p, 404, "No page with that id.");
  const live = await one("SELECT status,data,fetched_at,url FROM live_snapshots WHERE page_id=$1 ORDER BY fetched_at DESC LIMIT 1", [p.id]);
  const history = await q("SELECT version,score,created_at FROM page_versions WHERE page_id=$1 ORDER BY version", [p.id]);
  return { page: p, live, drift: live && live.data && !live.data.error ? driftFromBrief(live.data, p.brief) : [], history };
});

route("PUT", "/pages/:id", { auth: "edit" }, async ({ params, body, user }) => saveBrief(params.id, body.brief, body.baseVersion, str(body.note, 300), user));

async function saveBrief(id, brief, baseVersion, note, user, restoredFrom = null) {
  const p = await one("SELECT * FROM pages WHERE id=$1", [id]);
  need(p, 404, "No page with that id.");
  need(brief && typeof brief === "object" && !Array.isArray(brief), 400, "Missing brief.");
  need(JSON.stringify(brief).length < 240000, 413, "This brief is too large to save. Shorten the body copy.");
  if (p.version !== baseVersion) {
    const who = await one("SELECT name FROM users WHERE id=$1", [p.updated_by]);
    return { __raw: { status: 409, body: { error: `${who?.name || "Someone"} saved this page while you were editing. Reload to see their version, then re-apply your changes.`, current: p.version } } };
  }
  brief = { ...brief, id, updatedAt: Date.now() };
  brief.name = str(brief.name, 120) || p.name;
  brief.url = str(brief.url, 300) || p.url;
  const changed = changedFields(p.brief, brief);
  if (!changed.length) return { page: p, unchanged: true };
  const s = scoreOf(evaluate(brief));
  const v = p.version + 1;
  const row = await one(`UPDATE pages SET brief=$2,name=$3,url=$4,type=$5,score=$6,fails=$7,version=$8,updated_at=now(),updated_by=$9 WHERE id=$1 AND version=$10 RETURNING *`,
    [id, JSON.stringify(brief), brief.name, brief.url, brief.type || p.type, s.total, s.fails, v, user.id, p.version]);
  if (!row) return { __raw: { status: 409, body: { error: "Someone saved this page at the same moment. Reload and try again." } } };
  await q("INSERT INTO page_versions (page_id,version,brief,score,fails,changed,note,user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    [id, v, JSON.stringify(brief), s.total, s.fails, JSON.stringify(changed), restoredFrom != null ? `Restored version ${restoredFrom}${note ? ": " + note : ""}` : note, user.id]);
  const delta = s.total - p.score;
  const labels = changed.map((k) => FIELD_LABELS[k] || k);
  await logEvent({
    kind: "brief", page_id: id, user_id: user.id,
    severity: delta <= -10 ? "warn" : delta > 0 ? "good" : "info",
    title: `${user.name} ${restoredFrom != null ? `restored version ${restoredFrom} of` : "updated"} ${brief.name}: ${labels.slice(0, 4).join(", ")}${labels.length > 4 ? ` +${labels.length - 4} more` : ""} (score ${p.score}% → ${s.total}%)`,
    detail: { version: v, changed, from: p.score, to: s.total, note },
  });
  return { page: row };
}

route("POST", "/pages", { auth: "edit" }, async ({ body, user }) => {
  const name = str(body.name, 120);
  need(name, 400, "Give the page a name.");
  const type = ["home","service","about","profile","hub","article","event","faq","contact","legal"].includes(body.type) ? body.type : "article";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "page";
  let id = "c-" + slug, n = 2;
  while (await one("SELECT 1 FROM pages WHERE id=$1", [id])) id = `c-${slug}-${n++}`;
  const url = str(body.url, 300) || (type === "article" ? `/resources/${slug}/` : `/${slug}/`);
  const b = blank({ ...TEMPL.article, id, name, url, type, p: "", custom: true, schema: type === "article" ? TEMPL.article.schema : ["WebPage", "BreadcrumbList"] });
  const s = scoreOf(evaluate(b));
  await q("INSERT INTO pages (id,name,url,type,brief,score,fails,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [id, name, url, type, JSON.stringify(b), s.total, s.fails, user.id]);
  await q("INSERT INTO page_versions (page_id,version,brief,score,fails,note,user_id) VALUES ($1,0,$2,$3,$4,'Page added',$5)", [id, JSON.stringify(b), s.total, s.fails, user.id]);
  await logEvent({ kind: "brief", page_id: id, user_id: user.id, title: `${user.name} added the page ${name}` });
  return { id };
});

route("POST", "/pages/:id/archive", { auth: "admin" }, async ({ params, user }) => {
  const p = await one("UPDATE pages SET archived=true WHERE id=$1 RETURNING name", [params.id]);
  need(p, 404, "No page with that id.");
  await logEvent({ kind: "brief", page_id: params.id, user_id: user.id, title: `${user.name} archived ${p.name}` });
  return { ok: true };
});

route("GET", "/pages/:id/versions", {}, async ({ params }) => q(
  "SELECT v.version,v.score,v.fails,v.changed,v.note,v.created_at,u.name AS user_name FROM page_versions v LEFT JOIN users u ON u.id=v.user_id WHERE page_id=$1 ORDER BY version DESC", [params.id]));

route("GET", "/pages/:id/versions/:v", {}, async ({ params }) => {
  const v = parseInt(params.v, 10);
  const cur = await one("SELECT v.*,u.name AS user_name FROM page_versions v LEFT JOIN users u ON u.id=v.user_id WHERE page_id=$1 AND version=$2", [params.id, v]);
  need(cur, 404, "No such version.");
  const prev = await one("SELECT version,brief,score FROM page_versions WHERE page_id=$1 AND version<$2 ORDER BY version DESC LIMIT 1", [params.id, v]);
  return { version: cur, previous: prev };
});

route("POST", "/pages/:id/restore", { auth: "edit" }, async ({ params, body, user }) => {
  const v = await one("SELECT brief FROM page_versions WHERE page_id=$1 AND version=$2", [params.id, parseInt(body.version, 10)]);
  need(v, 404, "No such version.");
  const p = await one("SELECT version FROM pages WHERE id=$1", [params.id]);
  return saveBrief(params.id, v.brief, p.version, "", user, parseInt(body.version, 10));
});

route("POST", "/pages/:id/audit", { auth: "edit" }, async ({ params, user }) => {
  const p = await one("SELECT id,name,url,brief FROM pages WHERE id=$1", [params.id]);
  need(p, 404, "No page with that id.");
  const r = await auditPage(p, { userId: user.id });
  return { ...r, drift: r.data && !r.data.error ? driftFromBrief(r.data, p.brief) : [] };
});
route("GET", "/pages/:id/live", {}, async ({ params }) => q("SELECT id,status,data,fetched_at,url FROM live_snapshots WHERE page_id=$1 ORDER BY fetched_at DESC LIMIT 40", [params.id]));

/* ---------- activity ---------- */
route("GET", "/events", {}, async () => q("SELECT e.*,u.name AS user_name,p.name AS page_name FROM events e LEFT JOIN users u ON u.id=e.user_id LEFT JOIN pages p ON p.id=e.page_id ORDER BY at DESC LIMIT 400"));

/* ---------- uptime ---------- */
async function uptimeStats(days) {
  const monitors = await q("SELECT * FROM monitors ORDER BY id");
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const rows = await q(`SELECT monitor_id, date_trunc('day', at) AS day, count(*)::int AS total, sum(CASE WHEN ok THEN 1 ELSE 0 END)::int AS ok, avg(ms)::int AS ms
    FROM checks WHERE at >= $1 GROUP BY monitor_id, day`, [since]);
  const windows = await q(`SELECT monitor_id, sum(CASE WHEN at >= now() - interval '1 day' THEN 1 ELSE 0 END)::int AS t1, sum(CASE WHEN at >= now() - interval '1 day' AND ok THEN 1 ELSE 0 END)::int AS o1,
      sum(CASE WHEN at >= now() - interval '7 days' THEN 1 ELSE 0 END)::int AS t7, sum(CASE WHEN at >= now() - interval '7 days' AND ok THEN 1 ELSE 0 END)::int AS o7,
      count(*)::int AS t30, sum(CASE WHEN ok THEN 1 ELSE 0 END)::int AS o30,
      avg(CASE WHEN at >= now() - interval '1 day' THEN ms END)::int AS ms1
    FROM checks WHERE at >= $1 GROUP BY monitor_id`, [since]);
  const pct = (o, t) => (t ? Math.round((o / t) * 10000) / 100 : null);
  return monitors.map((m) => {
    const w = windows.find((x) => x.monitor_id === m.id) || {};
    const byDay = new Map(rows.filter((r) => r.monitor_id === m.id).map((r) => [new Date(r.day).toISOString().slice(0, 10), r]));
    const daysArr = [];
    for (let d = days - 1; d >= 0; d--) {
      const key = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
      const r = byDay.get(key);
      daysArr.push({ day: key, total: r?.total || 0, ok: r?.ok || 0, ms: r?.ms ?? null });
    }
    return { ...m, up24: pct(w.o1, w.t1), up7: pct(w.o7, w.t7), up30: pct(w.o30, w.t30), ms24: w.ms1 ?? null, days: daysArr };
  });
}
route("GET", "/uptime", {}, async () => {
  const monitors = await uptimeStats(90);
  const incidents = await q("SELECT i.*,m.name,m.url FROM incidents i JOIN monitors m ON m.id=i.monitor_id ORDER BY started_at DESC LIMIT 100");
  const recent = await q("SELECT monitor_id,at,ok,ms,status,error FROM checks WHERE at >= now() - interval '1 day' ORDER BY at");
  return { monitors, incidents: incidents.map((i) => ({ ...i, duration: fmtMins(Math.max(1, Math.round(((i.resolved_at ? new Date(i.resolved_at) : new Date()) - new Date(i.started_at)) / 60000))) })), recent, ssl: await getSetting("ssl", null) };
});
route("POST", "/monitors", { auth: "edit" }, async ({ body, user }) => {
  const url = str(body.url, 500); need(/^https?:\/\//.test(url), 400, "Enter a full URL starting with https://");
  const m = await one("INSERT INTO monitors (name,url,must_contain) VALUES ($1,$2,$3) RETURNING *", [str(body.name, 80) || url, url, str(body.must_contain, 200)]);
  await logEvent({ kind: "uptime", user_id: user.id, title: `${user.name} added the monitor ${m.name}` });
  return m;
});
route("PUT", "/monitors/:id", { auth: "edit" }, async ({ params, body }) => {
  const url = str(body.url, 500); need(/^https?:\/\//.test(url), 400, "Enter a full URL starting with https://");
  return one("UPDATE monitors SET name=$2,url=$3,must_contain=$4,active=$5 WHERE id=$1 RETURNING *", [+params.id, str(body.name, 80) || url, url, str(body.must_contain, 200), body.active !== false]);
});
route("DELETE", "/monitors/:id", { auth: "admin" }, async ({ params }) => { await q("DELETE FROM monitors WHERE id=$1", [+params.id]); return { ok: true }; });
route("POST", "/monitors/:id/check", { auth: "edit" }, async ({ params }) => {
  const m = await one("SELECT * FROM monitors WHERE id=$1", [+params.id]); need(m, 404, "No such monitor.");
  return runMonitor(m);
});
route("POST", "/ssl/check", { auth: "edit" }, async () => checkSsl());

/* ---------- maintenance ---------- */
route("GET", "/maintenance", {}, async () => q("SELECT m.*,u.name AS user_name FROM maintenance m LEFT JOIN users u ON u.id=m.user_id ORDER BY starts_at DESC LIMIT 300"));
route("POST", "/maintenance", { auth: "edit" }, async ({ body, user }) => {
  const kind = body.kind === "window" ? "window" : "log";
  const title = str(body.title, 160); need(title, 400, "Add a title.");
  const starts = body.starts_at ? new Date(body.starts_at) : new Date();
  const ends = body.ends_at ? new Date(body.ends_at) : null;
  need(!isNaN(starts), 400, "Start time isn't a valid date.");
  need(!ends || (!isNaN(ends) && ends > starts), 400, "The end must be after the start.");
  need(kind === "log" || ends, 400, "A maintenance window needs an end time.");
  const m = await one("INSERT INTO maintenance (kind,title,notes,category,starts_at,ends_at,user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [kind, title, str(body.notes, 4000), str(body.category, 40) || "general", starts.toISOString(), ends ? ends.toISOString() : null, user.id]);
  await logEvent({ kind: "maintenance", user_id: user.id, title: kind === "window" ? `${user.name} scheduled maintenance: ${title} (${starts.toISOString().slice(0, 16).replace("T", " ")} UTC)` : `${user.name} logged: ${title}` });
  if (kind === "window") await notify({ severity: "info", subject: `Maintenance scheduled: ${title}`, text: `From ${starts.toUTCString()} to ${ends.toUTCString()}. Downtime alerts are muted during this window.${m.notes ? "\n\n" + m.notes : ""}` });
  return m;
});
route("DELETE", "/maintenance/:id", { auth: "edit" }, async ({ params, user }) => {
  const m = await one("SELECT * FROM maintenance WHERE id=$1", [+params.id]); need(m, 404, "Not found.");
  need(isAdmin(user) || m.user_id === user.id, 403, "Only the person who added it or an admin can delete it.");
  await q("DELETE FROM maintenance WHERE id=$1", [m.id]);
  return { ok: true };
});

/* ---------- WordPress ---------- */
route("GET", "/wp", {}, async () => {
  const latest = await one("SELECT at,data FROM wp_snapshots ORDER BY at DESC LIMIT 1");
  const history = await q("SELECT e.*,u.name AS user_name FROM events e LEFT JOIN users u ON u.id=e.user_id WHERE kind='plugins' ORDER BY at DESC LIMIT 60");
  return { configured: !!process.env.WP_CONNECTOR_KEY, latest, history };
});
route("POST", "/wp/refresh", { auth: "edit" }, async ({ user }) => refreshWp({ userId: user.id }));

/* ---------- notifications & settings ---------- */
route("GET", "/notifications", {}, async () => q("SELECT * FROM notifications ORDER BY at DESC LIMIT 200"));
route("POST", "/notifications/test", { auth: "admin" }, async ({ user }) => ({ results: await notify({ subject: "Test alert", text: `${user.name} sent a test alert from Premier Visibility. If you can read this, alerts reach you.` }) }));
route("GET", "/settings", {}, async () => ({
  site: siteUrl(), alertEmails: (await getSetting("alert_emails", null)) || splitList(process.env.ALERT_EMAILS), sslWarnDays: await getSetting("ssl_warn_days", 21),
  channels: { slack: !!process.env.SLACK_WEBHOOK_URL, email: !!process.env.RESEND_API_KEY, connector: !!process.env.WP_CONNECTOR_KEY, cron: !!process.env.CRON_SECRET, database: !!process.env.DATABASE_URL },
}));
route("PUT", "/settings", { auth: "admin" }, async ({ body }) => {
  const emails = splitList(body.alertEmails);
  need(emails.every((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)), 400, "One of the alert emails isn't a valid address.");
  await setSetting("alert_emails", emails);
  const d = parseInt(body.sslWarnDays, 10); if (d > 0 && d < 120) await setSetting("ssl_warn_days", d);
  return { ok: true };
});
route("GET", "/users", { auth: "admin" }, async () => q("SELECT id,email,name,role,created_at FROM users ORDER BY name"));
route("POST", "/users", { auth: "admin" }, async ({ body, user }) => {
  const email = str(body.email, 200).toLowerCase(); need(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 400, "Enter a valid email.");
  need(String(body.password || "").length >= 10, 400, "Give them a starting password of at least 10 characters.");
  need(!(await one("SELECT 1 FROM users WHERE email=$1", [email])), 400, "That email already has an account.");
  const role = ["admin", "editor", "viewer"].includes(body.role) ? body.role : "editor";
  const u = await one("INSERT INTO users (email,name,role,pass_hash) VALUES ($1,$2,$3,$4) RETURNING id,email,name,role", [email, str(body.name, 80) || email, role, hashPassword(String(body.password))]);
  await logEvent({ kind: "system", user_id: user.id, title: `${user.name} added ${u.name} as ${role}` });
  return u;
});
route("PUT", "/users/:id", { auth: "admin" }, async ({ params, body, user }) => {
  const id = +params.id;
  if (body.role) { need(["admin", "editor", "viewer"].includes(body.role), 400, "Unknown role."); need(id !== user.id || body.role === "admin", 400, "You can't remove your own admin role."); await q("UPDATE users SET role=$2 WHERE id=$1", [id, body.role]); }
  if (body.password) { need(String(body.password).length >= 10, 400, "Use at least 10 characters."); await q("UPDATE users SET pass_hash=$2, failed_logins=0, locked_until=NULL WHERE id=$1", [id, hashPassword(String(body.password))]); }
  return { ok: true };
});
route("DELETE", "/users/:id", { auth: "admin" }, async ({ params, user }) => {
  need(+params.id !== user.id, 400, "You can't delete your own account.");
  await q("UPDATE pages SET updated_by=NULL WHERE updated_by=$1", [+params.id]);
  await q("UPDATE page_versions SET user_id=NULL WHERE user_id=$1", [+params.id]);
  await q("UPDATE events SET user_id=NULL WHERE user_id=$1", [+params.id]);
  await q("UPDATE maintenance SET user_id=NULL WHERE user_id=$1", [+params.id]);
  await q("DELETE FROM users WHERE id=$1", [+params.id]);
  return { ok: true };
});
route("GET", "/export", { auth: "admin" }, async () => ({
  exportedAt: new Date().toISOString(),
  pages: await q("SELECT * FROM pages"), versions: await q("SELECT * FROM page_versions ORDER BY page_id,version"),
  maintenance: await q("SELECT * FROM maintenance"), incidents: await q("SELECT * FROM incidents"),
}));
route("POST", "/run/daily", { auth: "admin" }, async () => daily());

/* ---------- scheduled jobs ---------- */
route("GET", "/cron/uptime", { auth: "cron" }, async () => ({ checks: await runAllMonitors() }));
route("GET", "/cron/daily", { auth: "cron" }, async () => daily());

async function daily() {
  const out = {};
  const step = async (k, fn) => { try { out[k] = await fn(); } catch (e) { console.error(k, e); out[k] = { error: String(e.message || e) }; } };
  await step("ssl", checkSsl);
  await step("wp", async () => { const r = await refreshWp(); return r.error ? { error: r.error } : { plugins: r.data.plugins.length, pending: r.data.plugins.filter((p) => p.update).length }; });
  await step("audit", () => auditAll());
  await step("prune", () => pruneChecks(120));
  return out;
}
