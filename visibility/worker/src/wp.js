// WordPress core/theme/plugin state from the Premier Visibility Connector plugin, with change tracking.
import { one, run, iso, j, dj, logEvent, siteUrl } from "./util.js";
import { notify } from "./notify.js";
import { noCache } from "./monitor.js";

export async function fetchWpStatus(env) {
  if (!env.WP_CONNECTOR_KEY) return { error: "The WordPress connector key isn't set yet. See Settings for how to connect the plugin." };
  try {
    const r = await fetch(noCache(siteUrl(env) + "/wp-json/premier-visibility/v1/status"), { headers: { "x-visibility-key": env.WP_CONNECTOR_KEY, "user-agent": "PremierVisibility/1.0" }, signal: AbortSignal.timeout(25000) });
    if (r.status === 401 || r.status === 403) return { error: "The connector rejected the key. Check it matches PREMIER_VISIBILITY_KEY in wp-config.php." };
    if (r.status === 404) return { error: "Connector endpoint not found. Is the Premier Visibility Connector plugin active?" };
    if (!r.ok) return { error: `WordPress returned HTTP ${r.status}` };
    try { return { data: await r.json() }; } catch { return { error: "WordPress returned something that isn't JSON (often a PHP error page)." }; }
  } catch (e) { return { error: e.name === "TimeoutError" ? "No response within 25s" : e.message }; }
}

export function diffWp(prev, cur) {
  const out = { updated: [], newUpdates: [], added: [], removed: [], core: null, php: null };
  if (!prev) return out;
  const pm = new Map((prev.plugins || []).map((p) => [p.file, p])), cm = new Map((cur.plugins || []).map((p) => [p.file, p]));
  for (const [f, c] of cm) {
    const p = pm.get(f);
    if (!p) { out.added.push(c); continue; }
    if (p.version !== c.version) out.updated.push({ name: c.name, from: p.version, to: c.version });
    if (c.update && p.update !== c.update) out.newUpdates.push({ name: c.name, from: c.version, to: c.update, security: !!c.security });
  }
  for (const [f, p] of pm) if (!cm.has(f)) out.removed.push(p);
  if (prev.core?.version !== cur.core?.version) out.core = { from: prev.core?.version, to: cur.core?.version };
  if (prev.php !== cur.php) out.php = { from: prev.php, to: cur.php };
  return out;
}

export async function refreshWp(env, userId = null) {
  const res = await fetchWpStatus(env);
  if (res.error) { await logEvent(env, { kind: "plugins", severity: "warn", title: `Could not read WordPress status: ${res.error}`, user_id: userId }); return res; }
  const cur = res.data;
  const prevRow = await one(env, "SELECT data FROM wp_snapshots ORDER BY at DESC, id DESC LIMIT 1");
  const prev = prevRow ? dj(prevRow.data) : null;
  await run(env, "INSERT INTO wp_snapshots (at,data) VALUES (?,?)", iso(), j(cur));
  const d = diffWp(prev, cur);
  const log = [...d.updated.map((u) => `${u.name} ${u.from} → ${u.to}`), ...(d.core ? [`WordPress core ${d.core.from} → ${d.core.to}`] : []),
    ...(d.php ? [`PHP ${d.php.from} → ${d.php.to}`] : []), ...d.added.map((p) => `Installed ${p.name} ${p.version}`), ...d.removed.map((p) => `Removed ${p.name}`)];
  if (log.length) {
    await run(env, "INSERT INTO maintenance (kind,title,notes,category,starts_at,auto,created_at) VALUES ('log',?,?,'updates',?,1,?)",
      log.length === 1 ? log[0] : `${log.length} WordPress changes detected`, log.join("\n"), iso(), iso());
    await logEvent(env, { kind: "plugins", severity: "good", title: `WordPress changes: ${log.join("; ").slice(0, 240)}`, detail: d, user_id: userId });
  }
  const pending = (cur.plugins || []).filter((p) => p.update);
  const list = prev ? d.newUpdates : pending.map((p) => ({ name: p.name, from: p.version, to: p.update, security: !!p.security }));
  const lines = list.map((u) => `• ${u.name}: ${u.from} → ${u.to}${u.security ? " (security)" : ""}`);
  if (cur.core?.update && prev?.core?.update !== cur.core.update) lines.unshift(`• WordPress core: ${cur.core.version} → ${cur.core.update}`);
  if (lines.length) {
    const sec = list.some((u) => u.security);
    await logEvent(env, { kind: "plugins", severity: sec ? "critical" : "warn", title: `${lines.length} update${lines.length > 1 ? "s" : ""} available`, detail: { list }, user_id: userId });
    await notify(env, { severity: sec ? "critical" : "warn", subject: `${lines.length} WordPress update${lines.length > 1 ? "s" : ""} available`, text: lines.join("\n") + "\n\nTest on staging first, then update production." });
  }
  return { data: cur, diff: d };
}
