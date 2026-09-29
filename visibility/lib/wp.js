// Pulls WordPress core/theme/plugin state from the Premier Visibility Connector plugin and records what changed.
import { q, one, logEvent, siteUrl } from "./db.js";
import { notify } from "./notify.js";

export async function fetchWpStatus() {
  const key = process.env.WP_CONNECTOR_KEY;
  if (!key) return { error: "WP_CONNECTOR_KEY is not set. Install the connector plugin and add the key to the app's environment." };
  const url = siteUrl() + "/wp-json/premier-visibility/v1/status";
  try {
    const r = await fetch(url, { headers: { "x-visibility-key": key, "user-agent": "PremierVisibility/1.0" }, signal: AbortSignal.timeout(20000) });
    const text = await r.text();
    if (r.status === 401 || r.status === 403) return { error: "The connector rejected the key. Check WP_CONNECTOR_KEY matches PREMIER_VISIBILITY_KEY in wp-config.php." };
    if (r.status === 404) return { error: "Connector endpoint not found. Is the Premier Visibility Connector plugin active?" };
    if (!r.ok) return { error: `WordPress returned HTTP ${r.status}` };
    try { return { data: JSON.parse(text) }; } catch { return { error: "WordPress returned something that isn't JSON (often a PHP error page)." }; }
  } catch (e) {
    return { error: e.name === "TimeoutError" ? "No response within 20s" : (e.cause?.code || e.message) };
  }
}

export function diffWp(prev, cur) {
  const out = { updated: [], newUpdates: [], added: [], removed: [], core: null, php: null };
  if (!prev) return out;
  const pm = new Map((prev.plugins || []).map((p) => [p.file, p]));
  const cm = new Map((cur.plugins || []).map((p) => [p.file, p]));
  for (const [f, c] of cm) {
    const p = pm.get(f);
    if (!p) { out.added.push(c); continue; }
    if (p.version !== c.version) out.updated.push({ name: c.name, from: p.version, to: c.version });
    if (c.update && (!p.update || p.update !== c.update)) out.newUpdates.push({ name: c.name, from: c.version, to: c.update, security: !!c.security });
  }
  for (const [f, p] of pm) if (!cm.has(f)) out.removed.push(p);
  if (prev.core?.version !== cur.core?.version) out.core = { from: prev.core?.version, to: cur.core?.version };
  if (prev.php !== cur.php) out.php = { from: prev.php, to: cur.php };
  return out;
}

export async function refreshWp({ userId = null } = {}) {
  const res = await fetchWpStatus();
  if (res.error) {
    await logEvent({ kind: "plugins", severity: "warn", title: `Could not read WordPress status: ${res.error}`, user_id: userId });
    return res;
  }
  const cur = res.data;
  const prevRow = await one("SELECT data FROM wp_snapshots ORDER BY at DESC LIMIT 1");
  const prev = prevRow?.data || null;
  await q("INSERT INTO wp_snapshots (data) VALUES ($1)", [JSON.stringify(cur)]);
  const d = diffWp(prev, cur);

  const logLines = [];
  d.updated.forEach((u) => logLines.push(`${u.name} ${u.from} → ${u.to}`));
  if (d.core) logLines.push(`WordPress core ${d.core.from} → ${d.core.to}`);
  if (d.php) logLines.push(`PHP ${d.php.from} → ${d.php.to}`);
  d.added.forEach((p) => logLines.push(`Installed ${p.name} ${p.version}`));
  d.removed.forEach((p) => logLines.push(`Removed ${p.name}`));
  if (logLines.length) {
    await q("INSERT INTO maintenance (kind,title,notes,category,auto) VALUES ('log',$1,$2,'updates',true)",
      [logLines.length === 1 ? logLines[0] : `${logLines.length} WordPress changes detected`, logLines.join("\n")]);
    await logEvent({ kind: "plugins", severity: "good", title: `WordPress changes: ${logLines.join("; ").slice(0, 240)}`, detail: d, user_id: userId });
  }
  const pending = (cur.plugins || []).filter((p) => p.update);
  if (d.newUpdates.length || (!prev && pending.length) || (d.core === null && cur.core?.update && prev?.core?.update !== cur.core.update)) {
    const list = (prev ? d.newUpdates : pending.map((p) => ({ name: p.name, from: p.version, to: p.update, security: p.security })));
    const lines = list.map((u) => `• ${u.name}: ${u.from} → ${u.to}${u.security ? " (security)" : ""}`);
    if (cur.core?.update && prev?.core?.update !== cur.core.update) lines.unshift(`• WordPress core: ${cur.core.version} → ${cur.core.update}`);
    if (lines.length) {
      const sec = list.some((u) => u.security);
      await logEvent({ kind: "plugins", severity: sec ? "critical" : "warn", title: `${lines.length} update${lines.length > 1 ? "s" : ""} available`, detail: { list }, user_id: userId });
      await notify({ severity: sec ? "critical" : "warn", subject: `${lines.length} WordPress update${lines.length > 1 ? "s" : ""} available`, text: lines.join("\n") + "\n\nTest on staging first, then update production." });
    }
  }
  return { data: cur, diff: d };
}
