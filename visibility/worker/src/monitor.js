// Uptime checks and incidents. Runs from Cloudflare's network, independent of the server it watches.
import { q, one, run, iso, logEvent, fmtMins } from "./util.js";
import { notify } from "./notify.js";

const FAILS_BEFORE_ALERT = 2; // two failed checks in a row (about 10 minutes) before an incident opens
const WP_FAILURES = [
  ["There has been a critical error", "WordPress critical error (PHP fatal)"],
  ["Error establishing a database connection", "Database connection error"],
  ["Briefly unavailable for scheduled maintenance", "Stuck in WordPress maintenance mode"],
];
export const noCache = (url) => url + (url.includes("?") ? "&" : "?") + "pv_nocache=" + Date.now();

export async function checkUrl(url, mustContain = "", timeoutMs = 15000) {
  const t0 = Date.now();
  try {
    const r = await fetch(noCache(url), { redirect: "follow", signal: AbortSignal.timeout(timeoutMs), headers: { "user-agent": "PremierVisibility/1.0 (+uptime)", "cache-control": "no-cache" } });
    const body = await r.text();
    const ms = Date.now() - t0;
    for (const [needle, label] of WP_FAILURES) if (body.includes(needle)) return { ok: false, status: r.status, ms, error: label };
    if (r.status >= 400) return { ok: false, status: r.status, ms, error: `HTTP ${r.status}` };
    if (mustContain && !body.includes(mustContain)) return { ok: false, status: r.status, ms, error: `Expected text "${mustContain}" not found` };
    return { ok: true, status: r.status, ms, error: "" };
  } catch (e) {
    const msg = e.name === "TimeoutError" ? `No response within ${timeoutMs / 1000}s` : (e.message || String(e));
    return { ok: false, status: null, ms: Date.now() - t0, error: /certificate|SSL|TLS/i.test(msg) ? `HTTPS problem: ${msg}` : msg };
  }
}

export async function currentWindow(env) {
  const now = iso();
  return one(env, "SELECT id,title FROM maintenance WHERE kind='window' AND starts_at <= ? AND (ends_at IS NULL OR ends_at >= ?) LIMIT 1", now, now);
}

export async function runMonitor(env, m) {
  const res = await checkUrl(m.url, m.must_contain);
  const at = iso();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO checks (monitor_id,at,ok,status,ms,error) VALUES (?,?,?,?,?,?)").bind(m.id, at, res.ok ? 1 : 0, res.status, res.ms, res.error),
    env.DB.prepare("INSERT INTO check_days (monitor_id,day,total,ok,ms_sum) VALUES (?,?,1,?,?) ON CONFLICT(monitor_id,day) DO UPDATE SET total=total+1, ok=ok+excluded.ok, ms_sum=ms_sum+excluded.ms_sum")
      .bind(m.id, at.slice(0, 10), res.ok ? 1 : 0, res.ms || 0),
  ]);
  const fails = res.ok ? 0 : m.fail_count + 1;
  let state = m.state;
  const win = await currentWindow(env);

  if (!res.ok && fails >= FAILS_BEFORE_ALERT && m.state !== "down") {
    state = "down";
    const first = await one(env, `SELECT at FROM checks WHERE monitor_id=? AND ok=0 ORDER BY at DESC, id DESC LIMIT 1 OFFSET ${fails - 1}`, m.id);
    await run(env, "INSERT INTO incidents (monitor_id,started_at,cause,in_window) VALUES (?,?,?,?)", m.id, first?.at || at, res.error, win ? 1 : 0);
    await logEvent(env, { kind: "uptime", severity: win ? "warn" : "critical", title: `${m.name} is down: ${res.error}`, detail: { monitor: m.id, url: m.url, status: res.status, window: win?.title || null } });
    if (!win) await notify(env, { severity: "critical", subject: `DOWN: ${m.name}`, text: `${m.url}\nReason: ${res.error}\nFailed ${fails} checks in a row.` });
  } else if (res.ok && m.state === "down") {
    state = "up";
    const inc = await one(env, "SELECT id,started_at,in_window FROM incidents WHERE monitor_id=? AND resolved_at IS NULL ORDER BY started_at DESC, id DESC LIMIT 1", m.id);
    let mins = null;
    if (inc) { await run(env, "UPDATE incidents SET resolved_at=? WHERE id=?", at, inc.id); mins = Math.max(1, Math.round((Date.now() - Date.parse(inc.started_at)) / 60000)); }
    await logEvent(env, { kind: "uptime", severity: "good", title: `${m.name} is back up${mins ? ` after ${fmtMins(mins)}` : ""}`, detail: { monitor: m.id, url: m.url, ms: res.ms } });
    if (!(inc && inc.in_window)) await notify(env, { severity: "good", subject: `RECOVERED: ${m.name}`, text: `${m.url} is responding again (${res.ms} ms).${mins ? ` Downtime: ${fmtMins(mins)}.` : ""}` });
  } else if (res.ok && m.state === "unknown") {
    state = "up";
  }
  await run(env, "UPDATE monitors SET state=?, fail_count=?, last_checked=?, last_status=?, last_ms=?, last_error=? WHERE id=?", state, fails, at, res.status, res.ms, res.error, m.id);
  return { ...res, state };
}

export async function runAllMonitors(env) {
  const ms = await q(env, "SELECT * FROM monitors WHERE active=1 ORDER BY id");
  const out = await Promise.all(ms.map((m) => runMonitor(env, m).then((r) => ({ id: m.id, name: m.name, ...r }))));
  return out;
}

export async function pruneChecks(env) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM checks WHERE at < ?").bind(iso(-14 * 864e5)),
    env.DB.prepare("DELETE FROM check_days WHERE day < ?").bind(iso(-400 * 864e5).slice(0, 10)),
  ]);
}
