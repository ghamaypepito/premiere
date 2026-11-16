// End-to-end tests: the Worker in Cloudflare's local runtime (wrangler dev + local D1) against a fake WordPress site.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const KEY = "k".repeat(30);
const ADMIN = "owner@example.com";
let site, dev, base, tmp, devLog = "";
const state = { mode: "ok", title: "Family Business Succession Planning | Premier", robots: "index,follow", pluginVersion: "3.2.0", pluginUpdate: "3.3.0" };
const page = () => `<!doctype html><html lang="en"><head><title>${state.title}</title><meta name="description" content="Succession planning for family businesses.">
<meta name="robots" content="${state.robots}"><link rel="canonical" href="https://example.com/x/">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Service"},{"@type":"FAQPage"}]}</script></head>
<body><h1>Family business <em>succession</em> planning</h1><h2>How long does it take?</h2><p>Premier helps families plan.</p><script>var notCounted = "one two three";</script>
<img src="a.jpg" alt=""><a href="/contact/">Book</a><a href="https://ffi.org/">FFI</a></body></html>`;

before(async () => {
  site = http.createServer((req, res) => {
    if (req.url.startsWith("/wp-json/premier-visibility/v1/status")) {
      if (req.headers["x-visibility-key"] !== KEY) { res.statusCode = 401; return res.end("{}"); }
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ core: { version: "6.8.2", update: null }, php: "8.3.1", theme: { name: "Hello Elementor", version: "3.4", update: null },
        plugins: [{ file: "elementor/elementor.php", name: "Elementor", version: state.pluginVersion, active: true, update: state.pluginUpdate, security: false }] }));
    }
    if (state.mode === "fatal") { res.statusCode = 200; return res.end("<p>There has been a critical error on this website.</p>"); }
    res.setHeader("content-type", "text/html"); res.end(page());
  });
  await new Promise((r) => site.listen(0, "127.0.0.1", r));
  tmp = mkdtempSync(join(tmpdir(), "pv-"));
  execFileSync("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--local", "--persist-to", tmp], { cwd: ROOT, stdio: "ignore", env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" } });
  const port = 8800 + Math.floor(Math.random() * 500);
  base = `http://127.0.0.1:${port}`;
  const vars = [`SITE_URL:http://127.0.0.1:${site.address().port}`, `WP_CONNECTOR_KEY:${KEY}`, `DEV_AUTH_EMAIL:${ADMIN}`, `ADMIN_EMAILS:${ADMIN}`];
  dev = spawn("npx", ["wrangler", "dev", "--local", "--persist-to", tmp, "--port", String(port), "--ip", "127.0.0.1", "--test-scheduled", ...vars.flatMap((v) => ["--var", v])], { cwd: ROOT, detached: true, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" } });
  dev.stdout.on("data", (d) => (devLog += d)); dev.stderr.on("data", (d) => (devLog += d));
  for (let i = 0; i < 120; i++) { try { const r = await fetch(base + "/"); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
});
after(() => { try { process.kill(-dev.pid, "SIGTERM"); } catch {} site?.close(); rmSync(tmp, { recursive: true, force: true }); });

async function call(method, path, body, headers = {}) {
  const r = await fetch(`${base}/admin/api${path}`, { method, headers: { origin: base, ...(body ? { "content-type": "application/json" } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  return { status: r.status, body: json };
}

test("app is served under /admin and the first user becomes admin", async () => {
  assert.equal((await fetch(base + "/admin/")).status, 200);
  assert.match(await (await fetch(base + "/admin/css/app.css")).text(), /--navy/);
  assert.equal((await fetch(base + "/admin", { redirect: "manual" })).status, 301);
  assert.equal((await fetch(base + "/api/me")).status, 200, "legacy /api path still answers");
  const me = await call("GET", "/me");
  assert.equal(me.status, 200, JSON.stringify(me.body) + devLog.slice(-800));
  assert.equal(me.body.user.email, ADMIN); assert.equal(me.body.user.role, "admin");
});

test("brief versions, conflicts, restore and cross-site protection", async () => {
  const pages = (await call("GET", "/pages")).body;
  assert.equal(pages.length, 20);
  assert.equal(pages.find((p) => p.id === "contact").url, "/get-in-touch/");
  const { page: p } = (await call("GET", "/pages/succession")).body;
  const b = { ...p.brief, seoTitle: "Family Business Succession Planning | Premier", h1: "Family business succession planning" };
  const saved = await call("PUT", "/pages/succession", { brief: b, baseVersion: 0, note: "First pass", score: 40, fails: 12 });
  assert.equal(saved.status, 200, JSON.stringify(saved.body)); assert.equal(saved.body.page.version, 1); assert.equal(saved.body.page.score, 40);
  assert.equal((await call("PUT", "/pages/succession", { brief: { ...b, owner: "Ana" }, baseVersion: 0 })).status, 409);
  const vers = (await call("GET", "/pages/succession/versions")).body;
  assert.deepEqual([...vers[0].changed].sort(), ["h1", "seoTitle"]);
  assert.equal((await call("GET", "/pages/succession/versions/1")).body.previous.version, 0);
  assert.equal((await call("POST", "/pages/succession/restore", { version: 0 })).body.page.version, 2);
  assert.equal((await call("GET", "/pages/succession")).body.page.brief.seoTitle, "");
  assert.equal((await call("PUT", "/pages/succession", { brief: b, baseVersion: 2 }, { origin: "https://evil.example" })).status, 403);
});

test("live audit (HTMLRewriter) extracts SEO signals and flags noindex as critical", async () => {
  const a1 = (await call("POST", "/pages/succession/audit")).body;
  assert.equal(a1.status, 200, JSON.stringify(a1));
  assert.deepEqual(a1.data.schema, ["FAQPage", "Service"]);
  assert.deepEqual(a1.data.h1, ["Family business succession planning"]);
  assert.equal(a1.data.h2Questions, 1); assert.equal(a1.data.imagesNoAlt, 1);
  assert.equal(a1.data.internalLinks, 1); assert.equal(a1.data.externalLinks, 1);
  assert.ok(a1.data.words >= 15 && a1.data.words < 30, `word count ${a1.data.words} should exclude script text`);
  state.robots = "noindex"; state.title = "Succession | Premier";
  const a2 = (await call("POST", "/pages/succession/audit")).body;
  assert.ok(a2.changes.some((c) => c.field === "noindex" && c.severity === "critical"));
  assert.ok((await call("GET", "/events")).body.some((e) => e.kind === "live" && e.severity === "critical"));
  assert.equal((await call("GET", "/pages")).body.find((p) => p.id === "succession").live_noindex, true);
  state.robots = "index,follow"; state.title = "Family Business Succession Planning | Premier";
});

test("uptime: critical-error page is down, incident opens after two failures and resolves; rollups feed stats", async () => {
  const home = (await call("GET", "/uptime")).body.monitors.find((m) => m.name === "Home page");
  state.mode = "fatal";
  let r = (await call("POST", `/monitors/${home.id}/check`)).body; assert.equal(r.ok, false); assert.equal(r.state, "unknown");
  r = (await call("POST", `/monitors/${home.id}/check`)).body; assert.equal(r.state, "down"); assert.match(r.error, /critical error/);
  state.mode = "ok";
  r = (await call("POST", `/monitors/${home.id}/check`)).body; assert.equal(r.state, "up");
  const up = (await call("GET", "/uptime")).body;
  assert.equal(up.incidents.length, 1); assert.ok(up.incidents[0].resolved_at);
  const m = up.monitors.find((x) => x.id === home.id);
  assert.equal(m.days.length, 90); assert.equal(m.days.at(-1).total, 3); assert.equal(m.days.at(-1).ok, 1);
  assert.ok((await call("GET", "/notifications")).body.some((n) => /DOWN: Home page/.test(n.subject)));
});

test("plugin updates are recorded and version changes land in the maintenance log", async () => {
  const r1 = (await call("POST", "/wp/refresh")).body; assert.equal(r1.data.plugins[0].update, "3.3.0");
  state.pluginVersion = "3.3.0"; state.pluginUpdate = null;
  const r2 = (await call("POST", "/wp/refresh")).body; assert.deepEqual(r2.diff.updated, [{ name: "Elementor", from: "3.2.0", to: "3.3.0" }]);
  assert.ok((await call("GET", "/maintenance")).body.some((m) => m.auto === true && /Elementor 3.2.0 → 3.3.0/.test(m.title)));
});

test("maintenance windows mute alerts", async () => {
  const now = Date.now();
  assert.equal((await call("POST", "/maintenance", { kind: "window", title: "Plugin updates", starts_at: new Date(now - 6e4).toISOString(), ends_at: new Date(now + 36e5).toISOString() })).status, 200);
  const before = (await call("GET", "/notifications")).body.length;
  const home = (await call("GET", "/uptime")).body.monitors.find((m) => m.name === "Home page");
  state.mode = "fatal";
  await call("POST", `/monitors/${home.id}/check`); await call("POST", `/monitors/${home.id}/check`);
  state.mode = "ok";
  await call("POST", `/monitors/${home.id}/check`);
  assert.equal((await call("GET", "/notifications")).body.length, before);
  assert.equal((await call("GET", "/uptime")).body.incidents[0].in_window, true);
});

test("cron trigger runs checks and an audit; batched audit endpoint; dashboard; playbook", async () => {
  const s = await fetch(`${base}/__scheduled?cron=${encodeURIComponent("*/5 * * * *")}`);
  assert.equal(s.status, 200, await s.text());
  const st = (await call("GET", "/settings")).body; assert.ok(st.lastCron.uptime, "cron recorded its run");
  const a = (await call("POST", "/run/audit")).body; assert.ok(Array.isArray(a.audited)); assert.ok(a.audited.length <= 2);
  const d = (await call("GET", "/dashboard")).body;
  assert.equal(d.trend.length, 90); assert.equal(d.wp.plugins, 1); assert.equal(typeof d.incidents30, "number");
  assert.match((await call("GET", "/playbook")).body.markdown, /Global SEO & AEO Playbook/);
});

test("public report shows health but no sensitive details", async () => {
  assert.equal((await fetch(`${base}/report`)).status, 200);
  const r = await fetch(`${base}/`);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Premier Visibility <em>report<\/em>/);
  assert.match(html, /Family Enterprise Planning|Succession/);
  assert.doesNotMatch(html, /Elementor|3\.3\.0|owner@example\.com|plugins?/i);
});

test("roles: a viewer can read but not edit", async () => {
  const viewer = { "x-dev-email": "viewer@example.com" };
  const me = await call("GET", "/me", null, viewer); assert.equal(me.body.user.role, "editor");
  await call("PUT", `/users/${me.body.user.id}`, { role: "viewer" });
  assert.equal((await call("GET", "/pages", null, viewer)).status, 200);
  assert.equal((await call("PUT", "/pages/home", { brief: { a: 1 }, baseVersion: 0 }, viewer)).status, 403);
});
