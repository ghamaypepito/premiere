// End-to-end tests: PHP built-in server + SQLite + a fake WordPress site.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));
const KEY = "k".repeat(30);
let site, php, base, env, tmp;
const state = { mode: "ok", title: "Family Business Succession Planning | Premier", robots: "index,follow", pluginVersion: "3.2.0", pluginUpdate: "3.3.0" };
const page = () => `<!doctype html><html lang="en"><head><title>${state.title}</title><meta name="description" content="Succession planning for family businesses.">
<meta name="robots" content="${state.robots}"><link rel="canonical" href="https://example.com/x/">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Service"},{"@type":"FAQPage"}]}</script></head>
<body><h1>Family business succession planning</h1><h2>How long does it take?</h2><p>Premier helps families.</p><img src="a.jpg" alt=""><a href="/contact/">Book</a></body></html>`;

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
  env = { ...process.env, DB_DSN: `sqlite:${join(tmp, "t.db")}`, SESSION_SECRET: "s".repeat(32), ADMIN_EMAIL: "jon@example.com", ADMIN_PASSWORD: "correct-horse-battery",
    SITE_URL: `http://127.0.0.1:${site.address().port}`, WP_CONNECTOR_KEY: KEY, CRON_SECRET: "c".repeat(20) };
  const port = 3300 + Math.floor(Math.random() * 500);
  base = `http://127.0.0.1:${port}`;
  php = spawn("php", ["-S", `127.0.0.1:${port}`], { cwd: PUBLIC, env, stdio: "ignore" });
  for (let i = 0; i < 50; i++) { try { await fetch(base + "/index.html"); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
});
after(() => { php?.kill(); site?.close(); rmSync(tmp, { recursive: true, force: true }); });

let cookie = "";
async function call(method, path, body, headers = {}) {
  const r = await fetch(`${base}/api/index.php?r=${encodeURIComponent(path)}`, { method, headers: { cookie, origin: base, ...(body ? { "content-type": "application/json" } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get("set-cookie"); if (sc) cookie = sc.split(";")[0];
  return { status: r.status, body: await r.json() };
}

test("app files are served", async () => {
  assert.equal((await fetch(base + "/index.html")).status, 200);
  assert.equal((await fetch(base + "/js/rules.js")).status, 200);
});

test("sign-in, brief versions, conflicts and restore", async () => {
  assert.equal((await call("GET", "/pages")).status, 401);
  assert.equal((await call("POST", "/login", { email: "jon@example.com", password: "wrong" })).status, 401);
  assert.equal((await call("POST", "/login", { email: "jon@example.com", password: "correct-horse-battery" })).status, 200);
  const pages = (await call("GET", "/pages")).body;
  assert.equal(pages.length, 20);
  assert.equal(pages.find((p) => p.id === "contact").url, "/get-in-touch/");
  const { page } = (await call("GET", "/pages/succession")).body;
  const b = { ...page.brief, seoTitle: "Family Business Succession Planning | Premier", h1: "Family business succession planning" };
  const saved = await call("PUT", "/pages/succession", { brief: b, baseVersion: 0, note: "First pass", score: 40, fails: 12 });
  assert.equal(saved.status, 200, JSON.stringify(saved.body)); assert.equal(saved.body.page.version, 1); assert.equal(saved.body.page.score, 40);
  assert.equal((await call("PUT", "/pages/succession", { brief: { ...b, owner: "Ana" }, baseVersion: 0 })).status, 409, "stale save must conflict");
  const vers = (await call("GET", "/pages/succession/versions")).body;
  assert.deepEqual([...vers[0].changed].sort(), ["h1", "seoTitle"]);
  const diff = (await call("GET", "/pages/succession/versions/1")).body;
  assert.equal(diff.previous.version, 0); assert.equal(diff.version.brief.h1, "Family business succession planning");
  assert.equal((await call("POST", "/pages/succession/restore", { version: 0 })).body.page.version, 2);
  assert.equal((await call("GET", "/pages/succession")).body.page.brief.seoTitle, "");
  assert.equal((await call("PUT", "/pages/succession", { brief: b, baseVersion: 2 }, { origin: "https://evil.example" })).status, 403, "cross-site write refused");
});

test("live audit records changes and flags noindex as critical", async () => {
  const a1 = (await call("POST", "/pages/succession/audit")).body;
  assert.equal(a1.status, 200); assert.deepEqual(a1.data.schema, ["FAQPage", "Service"]); assert.equal(a1.data.imagesNoAlt, 1); assert.equal(a1.data.h2Questions, 1);
  state.robots = "noindex"; state.title = "Succession | Premier";
  const a2 = (await call("POST", "/pages/succession/audit")).body;
  assert.ok(a2.changes.some((c) => c.field === "noindex" && c.severity === "critical"));
  assert.ok(a2.changes.some((c) => c.field === "title"));
  assert.ok((await call("GET", "/events")).body.some((e) => e.kind === "live" && e.severity === "critical"));
  assert.ok((await call("GET", "/pages")).body.find((p) => p.id === "succession").live_noindex === true);
  state.robots = "index,follow";
});

test("uptime: critical-error page counts as down, incident opens after two failures and resolves", async () => {
  const home = (await call("GET", "/uptime")).body.monitors.find((m) => m.name === "Home page");
  state.mode = "fatal";
  let r = (await call("POST", `/monitors/${home.id}/check`)).body; assert.equal(r.ok, false); assert.equal(r.state, "unknown");
  r = (await call("POST", `/monitors/${home.id}/check`)).body; assert.equal(r.state, "down"); assert.match(r.error, /critical error/);
  state.mode = "ok";
  r = (await call("POST", `/monitors/${home.id}/check`)).body; assert.equal(r.state, "up");
  const up = (await call("GET", "/uptime")).body;
  assert.equal(up.incidents.length, 1); assert.ok(up.incidents[0].resolved_at);
  assert.equal(up.monitors.find((m) => m.id === home.id).days.length, 90);
  assert.ok((await call("GET", "/notifications")).body.some((n) => /DOWN: Home page/.test(n.subject)));
});

test("plugin updates are recorded and version changes land in the maintenance log", async () => {
  const r1 = (await call("POST", "/wp/refresh")).body; assert.equal(r1.data.plugins[0].update, "3.3.0");
  state.pluginVersion = "3.3.0"; state.pluginUpdate = null;
  const r2 = (await call("POST", "/wp/refresh")).body; assert.deepEqual(r2.diff.updated, [{ name: "Elementor", from: "3.2.0", to: "3.3.0" }]);
  const log = (await call("GET", "/maintenance")).body; assert.ok(log.some((m) => m.auto === true && /Elementor 3.2.0 → 3.3.0/.test(m.title)));
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
  assert.equal((await call("GET", "/notifications")).body.length, before, "no alerts inside the window");
  assert.equal((await call("GET", "/uptime")).body.incidents[0].in_window, true);
});

test("dashboard, cron (CLI and URL) and team management", async () => {
  const d = (await call("GET", "/dashboard")).body;
  assert.equal(d.trend.length, 90); assert.equal(d.wp.plugins, 1); assert.ok(d.events.length > 0);
  const out = JSON.parse(execFileSync("php", ["app/cron.php", "uptime"], { cwd: PUBLIC, env }).toString());
  assert.equal(out.checks.length, 4);
  assert.equal((await call("GET", "/cron/uptime")).status, 401);
  assert.equal((await call("GET", "/cron/uptime", null, { authorization: "Bearer " + "c".repeat(20) })).status, 200);
  const u = await call("POST", "/users", { email: "ana@example.com", name: "Ana", role: "viewer", password: "a-long-password" });
  assert.equal(u.status, 200);
  const s = (await call("GET", "/settings")).body; assert.ok(s.lastCron.uptime);
  cookie = "";
  assert.equal((await call("POST", "/login", { email: "ana@example.com", password: "a-long-password" })).status, 200);
  assert.equal((await call("PUT", "/pages/home", { brief: { a: 1 }, baseVersion: 0 })).status, 403, "viewers can't edit");
});

test("playbook is served only to signed-in users", async () => {
  const saved = cookie; cookie = "";
  assert.equal((await call("GET", "/playbook")).status, 401);
  cookie = saved;
  assert.match((await call("GET", "/playbook")).body.markdown, /Global SEO & AEO Playbook/);
});
