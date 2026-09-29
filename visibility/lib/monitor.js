// Uptime checks, incidents and SSL expiry.
import tls from "node:tls";
import { q, one, logEvent, siteUrl, getSetting, setSetting } from "./db.js";
import { notify } from "./notify.js";

// WordPress failure pages that often come back with a 200 or 500 and still look "up" to a naive ping.
const WP_FAILURES = [
  ["There has been a critical error", "WordPress critical error (PHP fatal)"],
  ["Error establishing a database connection", "Database connection error"],
  ["Briefly unavailable for scheduled maintenance", "Stuck in WordPress maintenance mode"],
];
const FAILS_BEFORE_ALERT = 2; // two failed checks in a row (about 10 minutes) before an incident opens

export async function checkUrl(url, mustContain = "", timeoutMs = 15000) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      redirect: "follow", signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "PremierVisibility/1.0 (+uptime)", "cache-control": "no-cache" },
    });
    const body = await r.text();
    const ms = Date.now() - t0;
    for (const [needle, label] of WP_FAILURES) {
      if (body.includes(needle)) return { ok: false, status: r.status, ms, error: label };
    }
    if (r.status >= 400) return { ok: false, status: r.status, ms, error: `HTTP ${r.status}` };
    if (mustContain && !body.includes(mustContain)) return { ok: false, status: r.status, ms, error: `Expected text "${mustContain}" not found` };
    return { ok: true, status: r.status, ms, error: "" };
  } catch (e) {
    const msg = e.name === "TimeoutError" ? `No response within ${timeoutMs / 1000}s` : (e.cause?.code || e.message || String(e));
    return { ok: false, status: null, ms: Date.now() - t0, error: msg };
  }
}

export async function inMaintenanceWindow(at = new Date()) {
  const r = await one("SELECT id,title FROM maintenance WHERE kind='window' AND starts_at <= $1 AND (ends_at IS NULL OR ends_at >= $1) LIMIT 1", [at.toISOString()]);
  return r;
}

export async function runMonitor(m) {
  const res = await checkUrl(m.url, m.must_contain);
  await q("INSERT INTO checks (monitor_id,ok,status,ms,error) VALUES ($1,$2,$3,$4,$5)", [m.id, res.ok, res.status, res.ms, res.error]);
  const fails = res.ok ? 0 : m.fail_count + 1;
  let state = m.state;
  const win = await inMaintenanceWindow();

  if (!res.ok && fails >= FAILS_BEFORE_ALERT && m.state !== "down") {
    state = "down";
    const firstFail = await one("SELECT at FROM checks WHERE monitor_id=$1 AND ok=false ORDER BY at DESC OFFSET $2 LIMIT 1", [m.id, fails - 1]);
    await q("INSERT INTO incidents (monitor_id,started_at,cause,in_window) VALUES ($1,$2,$3,$4)",
      [m.id, firstFail?.at || new Date().toISOString(), res.error, !!win]);
    await logEvent({ kind: "uptime", severity: win ? "warn" : "critical", title: `${m.name} is down: ${res.error}`, detail: { monitor: m.id, url: m.url, status: res.status, window: win?.title || null } });
    if (!win) await notify({ severity: "critical", subject: `DOWN: ${m.name}`, text: `${m.url}\nReason: ${res.error}\nChecked ${fails} times in a row.` });
  } else if (res.ok && m.state === "down") {
    state = "up";
    const inc = await one("UPDATE incidents SET resolved_at=now() WHERE id=(SELECT id FROM incidents WHERE monitor_id=$1 AND resolved_at IS NULL ORDER BY started_at DESC LIMIT 1) RETURNING started_at, in_window", [m.id]);
    const mins = inc ? Math.max(1, Math.round((Date.now() - new Date(inc.started_at).getTime()) / 60000)) : null;
    await logEvent({ kind: "uptime", severity: "good", title: `${m.name} is back up${mins ? ` after ${fmtMins(mins)}` : ""}`, detail: { monitor: m.id, url: m.url, ms: res.ms } });
    if (!(inc && inc.in_window)) await notify({ severity: "good", subject: `RECOVERED: ${m.name}`, text: `${m.url} is responding again (${res.ms} ms).${mins ? ` Downtime: ${fmtMins(mins)}.` : ""}` });
  } else if (res.ok && m.state === "unknown") {
    state = "up";
  }
  await q("UPDATE monitors SET state=$2, fail_count=$3, last_checked=now(), last_status=$4, last_ms=$5, last_error=$6 WHERE id=$1",
    [m.id, state, fails, res.status, res.ms, res.error]);
  return { ...res, state };
}

export async function runAllMonitors() {
  const ms = await q("SELECT * FROM monitors WHERE active ORDER BY id");
  return Promise.all(ms.map((m) => runMonitor(m).then((r) => ({ id: m.id, name: m.name, ...r }))));
}

export function fmtMins(m) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return h < 48 ? `${h} h${r ? ` ${r} min` : ""}` : `${Math.round(h / 24)} days`;
}

export function certExpiry(host, port = 443) {
  return new Promise((resolve) => {
    const s = tls.connect({ host, port, servername: host, timeout: 10000 }, () => {
      const c = s.getPeerCertificate();
      s.end();
      resolve(c && c.valid_to ? { validTo: new Date(c.valid_to).toISOString(), issuer: c.issuer?.O || c.issuer?.CN || "" } : { error: "No certificate returned" });
    });
    s.on("error", (e) => resolve({ error: e.code || e.message }));
    s.on("timeout", () => { s.destroy(); resolve({ error: "Timed out" }); });
  });
}

export async function checkSsl() {
  const host = new URL(siteUrl()).hostname;
  const c = await certExpiry(host);
  const warnDays = await getSetting("ssl_warn_days", 21);
  const prev = await getSetting("ssl", null);
  const out = { host, checkedAt: new Date().toISOString(), ...c };
  if (c.validTo) {
    out.daysLeft = Math.floor((new Date(c.validTo).getTime() - Date.now()) / 864e5);
    if (out.daysLeft <= warnDays && (!prev || prev.daysLeft > warnDays || out.daysLeft <= 7)) {
      await logEvent({ kind: "ssl", severity: out.daysLeft <= 7 ? "critical" : "warn", title: `SSL certificate for ${host} expires in ${out.daysLeft} days` });
      await notify({ severity: "warn", subject: `SSL expires in ${out.daysLeft} days`, text: `The certificate for ${host} expires on ${out.validTo.slice(0, 10)}. Renew it before then or the site will show a security warning.` });
    }
  } else if (!prev || !prev.error) {
    await logEvent({ kind: "ssl", severity: "warn", title: `Could not read the SSL certificate for ${host}: ${c.error}` });
  }
  await setSetting("ssl", out);
  return out;
}

export async function pruneChecks(days = 120) {
  await q("DELETE FROM checks WHERE at < now() - ($1 || ' days')::interval", [String(days)]);
}
