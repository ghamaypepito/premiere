// Premier Visibility front end: hash router + views. No framework.
import { esc, FIELD_LABELS, TYPE_LABEL, briefMd, blank, evaluate, scoreOf, TEMPL } from "./rules.js";
import { mountBrief, copyText } from "./brief.js";
import { lineChart, uptimeBars } from "./charts.js";

const app = document.getElementById("app");
let me = null, dirty = false, badges = { incidents: 0, updates: 0 };

/* ---------- utilities ---------- */
async function api(method, path, body) {
  const r = await fetch("api/index.php?r=" + encodeURIComponent(path), { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  let data = null; try { data = await r.json(); } catch {}
  if (r.status === 401 && path !== "/login") { me = null; renderLogin(); throw new Error("signed out"); }
  if (!r.ok) { const e = new Error(data?.error || `Request failed (${r.status})`); e.status = r.status; e.data = data; throw e; }
  return data;
}
function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 3200); }
window.toast = toast;
const ago = (d) => {
  if (!d) return "never"; const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now"; if (s < 3600) return `${Math.round(s / 60)} min ago`; if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} days ago`; return new Date(d).toLocaleDateString();
};
const when = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "–");
const scoreColor = (s, f) => (s >= 80 && !f ? "var(--good)" : s >= 50 ? "var(--accent)" : "var(--bad)");
const meter = (s, f) => `<span class="meter"><span class="bar"><i style="width:${s}%;background:${scoreColor(s, f)}"></i></span><span class="score">${s}%</span></span>`;
const sevDot = (s) => `<span class="dot ${s === "critical" ? "critical" : s === "warn" ? "warn" : s === "good" ? "good" : ""}" title="${s}"></span>`;
const statusPill = (s) => `<span class="pill ${s === "Published" || s === "Ready" ? "good" : s === "Drafting" || s === "In review" ? "warn" : ""}">${esc(s || "Not started")}</span>`;
const livePill = (p) => p.no_live ? `<span class="pill info">Template</span>` : !p.live_at ? `<span class="pill">Not checked</span>` : p.live_status >= 400 || !p.live_status ? `<span class="pill bad">HTTP ${p.live_status || "none"}</span>` : (p.live_noindex === true || p.live_noindex === "true") ? `<span class="pill bad">noindex</span>` : `<span class="pill good">Live ${p.live_status}</span>`;
const canEdit = () => me && me.role !== "viewer";
const isAdmin = () => me && me.role === "admin";
const busy = async (btn, fn) => { const txt = btn.textContent; btn.disabled = true; btn.textContent = "Working…"; try { return await fn(); } catch (e) { if (e.message !== "signed out") toast(e.message); } finally { btn.disabled = false; btn.textContent = txt; } };

/* ---------- shell ---------- */
function renderLogin(err = "") {
  app.innerHTML = `<div class="login"><div class="pane">
    <img src="img/premier-logo-navy.png" alt="Premier Family Business Consulting" width="174" height="30">
    <form id="loginForm" novalidate>
      <span class="eyebrow">Premier Visibility</span>
      <h1>Every page, <em>accounted for.</em></h1>
      <p class="lede">SEO and AEO briefs, live-page changes, uptime and updates for the Premier website, in one place for the team.</p>
      <div class="field"><label for="lEmail">Email</label><input type="email" id="lEmail" autocomplete="username" required></div>
      <div class="field"><label for="lPass">Password</label><input type="password" id="lPass" autocomplete="current-password" required></div>
      <p class="err" id="lErr" role="alert">${esc(err)}</p>
      <button class="btn" type="submit">Sign in</button>
    </form>
    <p class="legal">Team access only. Ask an admin for an account.</p></div>
    <figure class="photo" style="margin:0"><figcaption><span>Premier Family Business Consulting</span>Uniting families in business, across generations.</figcaption></figure></div>`;
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try { const r = await api("POST", "/login", { email: lEmail.value, password: lPass.value }); me = r.user; boot(); }
    catch (x) { document.getElementById("lErr").textContent = x.message; }
  });
}

const NAV = [["#/", "Dashboard"], ["#/pages", "Pages"], ["#/activity", "Activity"], null, ["#/uptime", "Uptime", "incidents"], ["#/maintenance", "Maintenance"], ["#/plugins", "Plugins", "updates"], null, ["#/playbook", "Playbook"], ["#/settings", "Settings"]];
const initials = (n) => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
function shell() {
  const host = new URL(me.site).hostname;
  app.innerHTML = `<header class="masthead"><div class="mh">
      <a class="logo" href="#/" aria-label="Premier Visibility, dashboard"><img src="img/premier-logo-white.png" alt="Premier Family Business Consulting" width="151" height="26"><span>Visibility</span></a>
      <nav class="nav" id="nav" aria-label="Main"></nav>
      <div class="mh-right">
        <details class="who" id="who"><summary aria-label="Account"><span class="nm">${esc(me.name)}</span><span class="avatar" aria-hidden="true">${esc(initials(me.name))}</span></summary>
          <div class="menu"><div><b>${esc(me.name)}</b><div class="small muted">${esc(me.email)} · ${esc(me.role)}</div></div>
          <a class="link" href="${esc(me.site)}" target="_blank" rel="noopener">Open ${esc(host)} ↗</a>
          <a class="link" href="#/settings">Settings and password</a>
          <button class="btn ghost sm" type="button" id="logoutBtn">Sign out</button></div></details>
        <button type="button" class="menuBtn" id="menuBtn" aria-controls="nav" aria-expanded="false">Menu</button>
      </div></div></header>
    <main class="content" id="view"></main>
    <footer class="foot"><span>Premier Family Business Consulting · Visibility</span><span>Watching <a href="${esc(me.site)}" target="_blank" rel="noopener">${esc(host)}</a></span></footer>`;
  renderNav();
  document.getElementById("logoutBtn").onclick = async () => { await api("POST", "/logout"); me = null; renderLogin(); };
  const nav = document.getElementById("nav"), mb = document.getElementById("menuBtn"), who = document.getElementById("who");
  mb.onclick = () => { const o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", o); };
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) { nav.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); } });
  who.addEventListener("click", (e) => { if (e.target.closest(".menu a")) who.open = false; });
  document.addEventListener("click", (e) => { if (who.open && !who.contains(e.target)) who.open = false; });
}
function renderNav() {
  const nav = document.getElementById("nav"); if (!nav) return;
  const cur = location.hash || "#/";
  nav.innerHTML = NAV.map((n) => {
    if (!n) return `<div class="sep"></div>`;
    const [href, label, badge] = n;
    const active = href === "#/" ? cur === "#/" || cur === "" : cur.startsWith(href) || (href === "#/pages" && cur.startsWith("#/page/"));
    const count = badge ? badges[badge] : 0;
    return `<a href="${href}" ${active ? 'aria-current="page"' : ""}>${label}${count ? `<span class="badge ${badge === "incidents" ? "bad" : ""}">${count}</span>` : ""}</a>`;
  }).join("");
}
const view = () => document.getElementById("view");
const head = (eyebrow, title, sub = "", actions = "") => `<div class="phead"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div><div class="actions">${actions}</div></div>`;

/* ---------- router ---------- */
async function route() {
  if (!me) return;
  renderNav();
  const h = (location.hash || "#/").slice(1);
  const parts = h.split("/").filter(Boolean);
  // A fresh #view per route, so listeners added by the previous screen don't pile up.
  const oldView = view(), v = oldView.cloneNode(false); oldView.replaceWith(v);
  v.innerHTML = `<p class="muted">Loading…</p>`;
  try {
    if (!parts.length) await vDashboard();
    else if (parts[0] === "pages") await vPages();
    else if (parts[0] === "page") await vPage(decodeURIComponent(parts[1]), parts[2] || "brief", parts[3]);
    else if (parts[0] === "activity") await vActivity();
    else if (parts[0] === "uptime") await vUptime();
    else if (parts[0] === "maintenance") await vMaintenance();
    else if (parts[0] === "plugins") await vPlugins();
    else if (parts[0] === "playbook") await vPlaybook();
    else if (parts[0] === "settings") await vSettings();
    else v.innerHTML = `<div class="empty">That page doesn't exist. <a href="#/">Go to the dashboard</a>.</div>`;
  } catch (e) { if (e.message !== "signed out") v.innerHTML = `<div class="banner bad"><b>Couldn't load this view.</b> ${esc(e.message)}</div>`; }
  window.scrollTo({ top: 0 });
}
let lastHash = location.hash;
window.addEventListener("hashchange", () => {
  if (dirty && !confirm("You have unsaved changes on this brief. Leave without saving?")) { history.replaceState(null, "", lastHash); return; }
  dirty = false; lastHash = location.hash; route();
});
window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

/* ---------- dashboard ---------- */
async function vDashboard() {
  const d = await api("GET", "/dashboard");
  badges.incidents = d.openIncidents.length; badges.updates = d.wp?.pending || 0; renderNav();
  const pages = d.pages, avg = pages.length ? Math.round(pages.reduce((a, p) => a + p.score, 0) / pages.length) : 0;
  const ready = pages.filter((p) => p.score >= 80 && !p.fails).length;
  const liveIssues = pages.filter((p) => p.live_at && (p.live_status >= 400 || !p.live_status || p.live_noindex === "true")).length;
  const home = d.monitors[0];
  const down = d.monitors.filter((m) => m.state === "down");
  const ssl = d.ssl;
  view().innerHTML = `
  ${head("Overview", "Site <em>visibility</em>", `Brief quality, live SEO signals, uptime and updates for ${esc(new URL(me.site).hostname)}.`)}
  ${down.length ? `<div class="banner bad"><span class="dot down"></span><b>${down.map((m) => esc(m.name)).join(", ")} ${down.length > 1 ? "are" : "is"} down.</b> ${esc(down[0].last_error)} · <a href="#/uptime">See uptime</a></div>` : ""}
  ${d.nextWindow ? `<div class="banner info"><b>Maintenance ${new Date(d.nextWindow.starts_at) <= new Date() ? "in progress" : "scheduled"}:</b> ${esc(d.nextWindow.title)} · ${when(d.nextWindow.starts_at)} to ${when(d.nextWindow.ends_at)}. Alerts are muted during the window.</div>` : ""}
  <div class="kpis">
    <a class="kpi ${down.length ? "bad" : ""}" href="#/uptime"><span class="l">Uptime · 30 days</span><span class="v">${home?.up30 != null ? `${home.up30}<small>%</small>` : "–"}</span><span class="s"><span class="dot ${home?.state || ""}"></span> ${home ? `${esc(home.name)} is ${home.state}` : "No monitors"}</span></a>
    <a class="kpi" href="#/pages"><span class="l">Average brief score</span><span class="v">${avg}<small>%</small></span><span class="s">${ready} of ${pages.length} pages ready</span></a>
    <a class="kpi ${liveIssues ? "warn" : ""}" href="#/pages"><span class="l">Live SEO issues</span><span class="v">${liveIssues}</span><span class="s">pages with errors or noindex</span></a>
    <a class="kpi ${d.wp && d.wp.pending ? "warn" : ""}" href="#/plugins"><span class="l">Pending updates</span><span class="v">${d.wp ? d.wp.pending + (d.wp.core?.update ? 1 : 0) + (d.wp.themeUpdate ? 1 : 0) : "–"}</span><span class="s">${d.wp ? `checked ${ago(d.wp.at)}` : "connector not set up"}</span></a>
    <a class="kpi ${ssl?.daysLeft != null && ssl.daysLeft <= 21 ? "warn" : ""}" href="#/uptime"><span class="l">SSL certificate</span><span class="v">${ssl?.daysLeft != null ? `${ssl.daysLeft}<small> days</small>` : "–"}</span><span class="s">${ssl?.daysLeft != null ? `expires ${ssl.validTo.slice(0, 10)}` : ssl?.error ? esc(ssl.error) : "not checked yet"}</span></a>
  </div>
  <div class="cols">
    <section class="card"><header><h2>Average brief score</h2><span>last 90 days, all pages</span></header><div id="trend"></div></section>
    <section class="card"><header><h2>Uptime</h2><span>last 30 days</span></header><div id="ups"></div>
      <div class="legend"><span><i style="background:var(--good)"></i>99.5%+</span><span><i style="background:var(--gold)"></i>95–99.5%</span><span><i style="background:var(--bad)"></i>below 95%</span><span><i style="background:var(--none)"></i>no checks</span></div></section>
  </div>
  <div class="cols">
    <section class="card"><header><h2>Pages</h2><a href="#/pages" class="link">All pages →</a></header><div class="tbl"><table><thead><tr><th>Page</th><th>Status</th><th>Brief</th><th>Live</th></tr></thead><tbody>
      ${[...pages].sort((a, b) => a.score - b.score).slice(0, 8).map((p) => `<tr class="click" data-href="#/page/${encodeURIComponent(p.id)}"><td>${esc(p.name)}</td><td>${statusPill(p.status)}</td><td style="min-width:120px">${meter(p.score, p.fails)}</td><td>${livePill(p)}</td></tr>`).join("")}
    </tbody></table></div><span class="hint">Lowest scores first.</span></section>
    <section class="card"><header><h2>Recent activity</h2><a href="#/activity" class="link">All activity →</a></header><div class="feed">${feed(d.events)}</div></section>
  </div>`;
  lineChart(document.getElementById("trend"), d.trend.map((t) => ({ x: new Date(t.day), y: t.avg })), { yMax: 100, yFmt: (v) => v + "%", emptyText: "Scores appear here once briefs are saved." });
  document.getElementById("ups").innerHTML = d.monitors.map((m, i) => `<div class="mon"><div class="h"><span><span class="dot ${m.state}"></span> <b>${esc(m.name)}</b></span><span class="mono small">${m.up30 != null ? m.up30 + "%" : "–"}</span></div><div id="ub-${i}"></div></div>`).join("") || `<div class="empty">No monitors yet.</div>`;
  d.monitors.forEach((m, i) => uptimeBars(document.getElementById("ub-" + i), m.days));
  bindRows();
}
function feed(events) {
  if (!events.length) return `<div class="empty">Nothing yet. Saves, live changes, incidents and updates appear here.</div>`;
  return events.map((e) => `<div class="ev">${sevDot(e.severity)}<div><div class="t">${e.page_id ? `<a href="#/page/${encodeURIComponent(e.page_id)}/${e.kind === "live" ? "live" : "history"}">${esc(e.title)}</a>` : esc(e.title)}</div>
    <div class="m">${esc(kindLabel(e.kind))}${e.user_name ? ` · ${esc(e.user_name)}` : ""}${e.detail?.note ? ` · “${esc(e.detail.note)}”` : ""}</div></div><time datetime="${e.at}" title="${when(e.at)}">${ago(e.at)}</time></div>`).join("");
}
const kindLabel = (k) => ({ brief: "Brief change", live: "Live page change", uptime: "Uptime", ssl: "SSL", plugins: "Plugins & updates", maintenance: "Maintenance", system: "Team" }[k] || k);
function bindRows() { view().querySelectorAll("tr[data-href]").forEach((tr) => tr.addEventListener("click", () => (location.hash = tr.dataset.href))); }

/* ---------- pages ---------- */
async function vPages() {
  const pages = await api("GET", "/pages");
  let filter = "all", search = "";
  view().innerHTML = `${head("SEO & AEO", "Every page, <em>accounted for</em>", "Every page's brief score, publishing status and what the live page is serving. Select a page to edit its brief, see its history or check it live.",
    canEdit() ? `<button class="btn ghost" id="auditAll" type="button" ${isAdmin() ? "" : "hidden"}>Check all live pages</button><button class="btn" id="addPage" type="button">Add page</button>` : "")}
  <form class="card" id="addForm" hidden><header><h3>Add a page or article</h3></header><div class="grid">
    <div class="field"><label for="npName">Name</label><input type="text" id="npName" required placeholder="How to Write a Family Constitution"></div>
    <div class="field"><label for="npType">Type</label><select id="npType">${Object.entries(TYPE_LABEL).map(([k, v]) => `<option value="${k}" ${k === "article" ? "selected" : ""}>${v}</option>`).join("")}</select></div>
    <div class="field full"><label for="npUrl">URL (optional)</label><input type="text" id="npUrl" placeholder="/resources/how-to-write-a-family-constitution/"></div></div>
    <div class="row"><button class="btn" type="submit">Create page</button><button class="btn ghost" type="button" id="npCancel">Cancel</button></div></form>
  <div class="row"><input type="search" id="pgSearch" placeholder="Search pages or keywords" style="max-width:320px" aria-label="Search pages">
    <div class="chips" id="pgFilter">${["all", "Not started", "Drafting", "In review", "Ready", "Published", "needs work"].map((f) => `<button type="button" class="chip" data-f="${f}" aria-pressed="${f === "all"}">${f === "all" ? "All" : f === "needs work" ? "Red items" : f}</button>`).join("")}</div></div>
  <section class="card"><div class="tbl"><table><thead><tr><th>Page</th><th>Primary keyword</th><th>Owner</th><th>Status</th><th>Brief score</th><th>Live page</th><th>Last change</th></tr></thead><tbody id="pgBody"></tbody></table></div></section>`;
  const draw = () => {
    const s = search.toLowerCase();
    const rows = pages.filter((p) => (filter === "all" || (filter === "needs work" ? p.fails > 0 : p.status === filter)) && (!s || (p.name + " " + (p.primary || "") + " " + p.url).toLowerCase().includes(s)));
    document.getElementById("pgBody").innerHTML = rows.map((p) => `<tr class="click" data-href="#/page/${encodeURIComponent(p.id)}"><td><b>${esc(p.name)}</b><br><span class="small muted">${esc(p.url)}</span></td><td>${esc(p.primary || "–")}</td><td>${esc(p.owner || "–")}</td><td>${statusPill(p.status)}</td>
      <td style="min-width:130px">${meter(p.score, p.fails)}${p.fails ? `<span class="small" style="color:var(--bad)">${p.fails} red</span>` : ""}</td><td>${livePill(p)}${p.live_at ? `<br><span class="small muted">${ago(p.live_at)}</span>` : ""}</td>
      <td class="small">${p.version ? `v${p.version} · ${esc(p.updated_by_name || "–")}<br><span class="muted">${ago(p.updated_at)}</span>` : `<span class="muted">Not edited yet</span>`}</td></tr>`).join("") || `<tr><td colspan="7" class="muted">No pages match.</td></tr>`;
    bindRows();
  };
  draw();
  document.getElementById("pgSearch").addEventListener("input", (e) => { search = e.target.value; draw(); });
  document.getElementById("pgFilter").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; filter = b.dataset.f; document.querySelectorAll("#pgFilter .chip").forEach((c) => c.setAttribute("aria-pressed", c === b)); draw(); });
  if (canEdit()) {
    const form = document.getElementById("addForm");
    document.getElementById("addPage").onclick = () => { form.hidden = false; npName.focus(); };
    document.getElementById("npCancel").onclick = () => (form.hidden = true);
    form.addEventListener("submit", async (e) => { e.preventDefault(); try { const b = blank({ ...TEMPL.article, id: "new", name: npName.value, url: npUrl.value, type: npType.value, p: "", custom: true, noLive: false }); const sc = scoreOf(evaluate(b)); const r = await api("POST", "/pages", { name: npName.value, type: npType.value, url: npUrl.value, brief: b, score: sc.total, fails: sc.fails }); location.hash = `#/page/${encodeURIComponent(r.id)}`; } catch (x) { toast(x.message); } });
    const aa = document.getElementById("auditAll");
    aa.onclick = () => busy(aa, async () => { await api("POST", "/run/daily"); toast("Live pages checked"); route(); });
  }
}

async function vPage(id, tab, sub) {
  const d = await api("GET", `/pages/${encodeURIComponent(id)}`);
  const p = d.page;
  const tabs = [["brief", "Brief"], ["history", `History · ${p.version}`], ["live", `Live page${d.drift.length ? ` · ${d.drift.length} drift` : ""}`]];
  view().innerHTML = `${head(`${esc(TYPE_LABEL[p.type] || "Page")} · <a href="#/pages">All pages</a>`, esc(p.name), `<span class="mono">${esc(p.url)}</span> · ${p.version ? `version ${p.version}, saved ${ago(p.updated_at)} by ${esc(p.updated_by_name || "–")}` : "not edited yet"}`,
    `<a class="btn ghost" href="${esc(absUrl(p.url))}" target="_blank" rel="noopener">Open live page</a>${isAdmin() ? `<button class="btn danger sm" type="button" id="archiveBtn">Archive</button>` : ""}`)}
  <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${k === tab}">${l}</button>`).join("")}</div><div id="tabBody"></div>`;
  view().querySelector(".tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) location.hash = `#/page/${encodeURIComponent(id)}/${b.dataset.tab}`; });
  document.getElementById("archiveBtn")?.addEventListener("click", async () => { if (!confirm(`Archive ${p.name}? Its history is kept.`)) return; await api("POST", `/pages/${encodeURIComponent(id)}/archive`); location.hash = "#/pages"; });
  const body = document.getElementById("tabBody");
  if (tab === "history") return pageHistory(body, p, sub);
  if (tab === "live") return pageLive(body, p, d);
  return pageBrief(body, p, d);
}
const absUrl = (u) => (/^https?:/.test(u) ? u : me.site + u);

function pageBrief(body, p, d) {
  let base = p.version, current = p.brief;
  body.innerHTML = `${canEdit() ? `<div class="savebar"><input type="text" id="saveNote" placeholder="What changed? (optional, shows in history)" aria-label="Change note"><span class="dirty" id="dirtyFlag" hidden>Unsaved changes</span>
    <button class="btn" type="button" id="saveBtn" disabled>Save version</button><button class="btn ghost" type="button" id="mdBtn">Copy brief</button></div>` : `<div class="banner info">Your account can view briefs but not edit them.</div>`}
    ${d.history.length > 1 ? `<section class="card"><header><h3>Score over time</h3><span>${d.history.length - 1} saved version${d.history.length > 2 ? "s" : ""}</span></header><div id="hist"></div></section>` : ""}
    <div id="editor"></div>`;
  if (d.history.length > 1) lineChart(document.getElementById("hist"), d.history.map((h) => ({ x: new Date(h.created_at), y: h.score, label: `v${h.version}` })), { height: 120, yMax: 100, yFmt: (v) => v + "%" });
  const ed = mountBrief(document.getElementById("editor"), p.brief, { readOnly: !canEdit(), onChange: (b) => { current = b; setDirty(true); } });
  const saveBtn = document.getElementById("saveBtn"), flag = document.getElementById("dirtyFlag");
  function setDirty(v) { dirty = v; if (saveBtn) { saveBtn.disabled = !v; flag.hidden = !v; } }
  document.getElementById("mdBtn")?.addEventListener("click", () => copyText(briefMd(ed.get()), "Brief"));
  saveBtn?.addEventListener("click", () => busy(saveBtn, async () => {
    try {
      const sc = scoreOf(evaluate(current));
      const r = await api("PUT", `/pages/${encodeURIComponent(p.id)}`, { brief: current, baseVersion: base, note: document.getElementById("saveNote").value, score: sc.total, fails: sc.fails });
      if (r.unchanged) { toast("Nothing changed since the last version"); setDirty(false); return; }
      base = r.page.version; setDirty(false); document.getElementById("saveNote").value = "";
      toast(`Saved version ${base} · score ${r.page.score}%`);
      view().querySelector('[data-tab="history"]').textContent = `History · ${base}`;
    } catch (e) {
      if (e.status === 409) { toast(e.message); flag.textContent = "Someone else saved first. Copy your edits, then reload."; flag.hidden = false; }
      else throw e;
    }
  }));
}

async function pageHistory(body, p, sel) {
  const versions = await api("GET", `/pages/${encodeURIComponent(p.id)}/versions`);
  const v = sel != null ? +sel : versions[0]?.version;
  body.innerHTML = `<div class="cols" style="grid-template-columns:minmax(0,340px) minmax(0,1fr)">
    <section class="card" style="padding:0"><div class="timeline">${versions.map((x, i) => {
      const prev = versions[i + 1]; const dlt = prev ? x.score - prev.score : 0;
      return `<button type="button" class="tl" data-v="${x.version}" aria-current="${x.version === v}"><span class="v">v${x.version}</span><span><span>${x.version === 0 ? esc(x.note || "Starting brief") : esc(x.changed.map((k) => FIELD_LABELS[k] || k).slice(0, 3).join(", ") + (x.changed.length > 3 ? ` +${x.changed.length - 3}` : ""))}</span>
        <span class="d" style="display:block">${esc(x.user_name || "System")} · ${ago(x.created_at)}${x.note && x.version ? ` · “${esc(x.note)}”` : ""}</span></span>
        <span style="text-align:right"><span class="score">${x.score}%</span><br>${dlt ? `<span class="delta ${dlt > 0 ? "up" : "down"}">${dlt > 0 ? "+" : ""}${dlt}</span>` : ""}</span></button>`; }).join("")}</div></section>
    <section class="card" id="diffCard"><p class="muted">Select a version.</p></section></div>`;
  body.querySelector(".timeline").addEventListener("click", (e) => { const b = e.target.closest(".tl"); if (b) location.hash = `#/page/${encodeURIComponent(p.id)}/history/${b.dataset.v}`; });
  if (v == null) return;
  const d = await api("GET", `/pages/${encodeURIComponent(p.id)}/versions/${v}`);
  const cur = d.version, prev = d.previous;
  const fields = cur.version === 0 ? [] : cur.changed;
  document.getElementById("diffCard").innerHTML = `<header><h3>Version ${cur.version}</h3><span>${esc(cur.user_name || "System")} · ${when(cur.created_at)}</span></header>
    ${cur.note ? `<div class="banner info">${esc(cur.note)}</div>` : ""}
    <div class="row"><span>Score ${prev ? `${prev.score}% → ` : ""}<b class="score">${cur.score}%</b></span><span class="muted">·</span><span>${cur.fails} red item${cur.fails === 1 ? "" : "s"}</span>
    ${canEdit() && cur.version !== p.version ? `<button class="btn sm ghost" type="button" id="restoreBtn">Restore this version</button>` : ""}</div>
    <div class="diff">${fields.length ? fields.map((k) => `<div class="f"><h4>${esc(FIELD_LABELS[k] || k)}</h4>${diffField(prev?.brief?.[k], cur.brief[k])}</div>`).join("") : `<p class="muted">${cur.version === 0 ? "This is the starting brief created from the page template." : "No field changes."}</p>`}</div>`;
  document.getElementById("restoreBtn")?.addEventListener("click", async (e) => busy(e.target, async () => {
    const r = await api("POST", `/pages/${encodeURIComponent(p.id)}/restore`, { version: cur.version });
    toast(r.unchanged ? "That version matches the current brief" : `Restored as version ${r.page.version}`); location.hash = `#/page/${encodeURIComponent(p.id)}/history`;
  }));
}
function asLines(v) {
  if (v == null || v === "") return [];
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? (x.q ? `Q: ${x.q}\nA: ${x.a}` : JSON.stringify(x)) : String(x))).join("\n").split("\n");
  if (typeof v === "object") return Object.entries(v).map(([k, x]) => `${k}: ${x}`);
  return String(v).split("\n");
}
function diffField(a, b) {
  const A = asLines(a), B = asLines(b);
  if (A.length * B.length > 250000) return `<pre class="dl del">${esc(A.join("\n"))}</pre><pre class="dl add">${esc(B.join("\n"))}</pre>`;
  const m = A.length, n = B.length, L = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0, same = 0;
  const pushSame = (line) => { same++; out.push(`<pre class="dl same">${esc(line) || " "}</pre>`); };
  while (i < m && j < n) { if (A[i] === B[j]) { pushSame(A[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push(`<pre class="dl del">${esc(A[i++]) || " "}</pre>`); else out.push(`<pre class="dl add">${esc(B[j++]) || " "}</pre>`); }
  while (i < m) out.push(`<pre class="dl del">${esc(A[i++]) || " "}</pre>`);
  while (j < n) out.push(`<pre class="dl add">${esc(B[j++]) || " "}</pre>`);
  if (!out.length) return `<span class="muted small">(empty)</span>`;
  return `<div>${out.join("")}</div>`;
}

async function pageLive(body, p, d) {
  const snaps = await api("GET", `/pages/${encodeURIComponent(p.id)}/live`);
  const L = d.live?.data;
  const row = (k, v) => `<tr><th style="width:170px">${k}</th><td>${v}</td></tr>`;
  const list = (a) => (a && a.length ? a.map(esc).join("<br>") : `<span class="muted">none</span>`);
  body.innerHTML = `<div class="row" style="justify-content:space-between"><span class="muted">${d.live ? `Last checked ${when(d.live.fetched_at)} · checks run daily` : "This page hasn't been checked yet."}</span>
    ${canEdit() ? `<button class="btn" type="button" id="auditBtn">Check live page now</button>` : ""}</div>
    ${d.drift.length ? `<section class="card"><header><h3>Live page vs brief</h3><span>${d.drift.length} difference${d.drift.length > 1 ? "s" : ""}</span></header><div class="tbl"><table><thead><tr><th>Field</th><th>Brief says</th><th>Live page has</th></tr></thead><tbody>
      ${d.drift.map((x) => `<tr><td><b>${esc(x.field)}</b>${x.note ? `<br><span class="small muted">${esc(x.note)}</span>` : ""}</td><td>${esc(x.brief)}</td><td>${esc(x.live) || '<span class="muted">(empty)</span>'}</td></tr>`).join("")}</tbody></table></div></section>`
      : d.live ? `<div class="banner info">The live page matches the brief's title, meta description, H1 and schema.</div>` : ""}
    ${L ? `<section class="card"><header><h3>What the live page serves</h3><span>HTTP ${d.live.status}</span></header>${L.error ? `<div class="banner bad">${esc(L.error)}</div>` : ""}<div class="tbl"><table><tbody>
      ${row("Title", `${esc(L.title) || '<span class="muted">(missing)</span>'} <span class="small muted mono">${(L.title || "").length} chars</span>`)}
      ${row("Meta description", `${esc(L.metaDesc) || '<span class="muted">(missing)</span>'} <span class="small muted mono">${(L.metaDesc || "").length} chars</span>`)}
      ${row("Robots", L.noindex ? `<span class="pill bad">${esc(L.robots)}</span>` : esc(L.robots || "index (default)"))}
      ${row("Canonical", esc(L.canonical) || '<span class="muted">(missing)</span>')}
      ${row("H1", list(L.h1))}${row("H2s", `${L.h2Count ?? 0} (${L.h2Questions ?? 0} phrased as questions)`)}
      ${row("Schema types", list(L.schema) + (L.schemaInvalid ? `<br><span class="pill bad">${L.schemaInvalid} JSON-LD block${L.schemaInvalid > 1 ? "s" : ""} won't parse</span>` : ""))}
      ${row("Words", L.words ?? "–")}${row("Links", `${L.internalLinks ?? 0} internal · ${L.externalLinks ?? 0} external`)}
      ${row("Images", `${L.images ?? 0} images · ${L.imagesNoAlt ? `<span class="pill warn">${L.imagesNoAlt} without alt text</span>` : "all have alt text"}`)}
      ${row("Social image", esc(L.ogImage) || '<span class="muted">(missing)</span>')}${row("Language / hreflang", `${esc(L.lang || "–")} · ${list(L.hreflang)}`)}
    </tbody></table></div></section>` : ""}
    <section class="card"><header><h3>Snapshot history</h3><span>a new snapshot is stored only when something changes</span></header><div class="tbl"><table><thead><tr><th>Captured</th><th>HTTP</th><th>Title</th><th>Robots</th><th>Schema</th><th class="n">Words</th></tr></thead><tbody>
      ${snaps.map((s) => `<tr><td class="small">${when(s.fetched_at)}</td><td>${s.status >= 400 || !s.status ? `<span class="pill bad">${s.status || "none"}</span>` : s.status}</td><td>${esc(s.data.title || s.data.error || "")}</td><td>${s.data.noindex ? '<span class="pill bad">noindex</span>' : esc(s.data.robots || "index")}</td><td class="small">${esc((s.data.schema || []).join(", "))}</td><td class="n">${s.data.words ?? "–"}</td></tr>`).join("") || `<tr><td colspan="6" class="muted">No snapshots yet.</td></tr>`}
    </tbody></table></div></section>`;
  document.getElementById("auditBtn")?.addEventListener("click", (e) => busy(e.target, async () => {
    const r = await api("POST", `/pages/${encodeURIComponent(p.id)}/audit`);
    toast(r.unchanged ? "Checked: nothing changed" : r.changes?.length ? `${r.changes.length} change${r.changes.length > 1 ? "s" : ""} recorded` : "Snapshot saved");
    route();
  }));
}

/* ---------- activity ---------- */
async function vActivity() {
  const events = await api("GET", "/events");
  let k = "all";
  view().innerHTML = `${head("Audit trail", "What <em>changed</em>, and who changed it", "Every brief save, live-page change, outage, update and maintenance note, newest first.")}
    <div class="chips" id="evFilter">${["all", "brief", "live", "uptime", "plugins", "maintenance", "ssl", "system"].map((x) => `<button type="button" class="chip" data-k="${x}" aria-pressed="${x === "all"}">${x === "all" ? "All" : kindLabel(x)}</button>`).join("")}</div>
    <section class="card"><div class="feed" id="evList"></div></section>`;
  const draw = () => { document.getElementById("evList").innerHTML = feed(events.filter((e) => k === "all" || e.kind === k)); };
  draw();
  document.getElementById("evFilter").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; k = b.dataset.k; document.querySelectorAll("#evFilter .chip").forEach((c) => c.setAttribute("aria-pressed", c === b)); draw(); });
}

/* ---------- uptime ---------- */
async function vUptime() {
  const d = await api("GET", "/uptime");
  badges.incidents = d.incidents.filter((i) => !i.resolved_at).length; renderNav();
  view().innerHTML = `${head("Site health", "Uptime and <em>incidents</em>", "Checked every 5 minutes. An incident opens after two failed checks in a row, and alerts go out when a monitor goes down and when it recovers. WordPress critical-error pages count as down even when they return HTTP 200.",
    canEdit() ? `<button class="btn ghost" type="button" id="sslBtn">Check SSL</button><button class="btn" type="button" id="addMon">Add monitor</button>` : "")}
    <form class="card" id="monForm" hidden><header><h3>Add a monitor</h3></header><div class="grid">
      <div class="field"><label for="mName">Name</label><input type="text" id="mName" placeholder="Insights hub"></div>
      <div class="field"><label for="mUrl">URL</label><input type="url" id="mUrl" required placeholder="${esc(me.site)}/resources/"></div>
      <div class="field full"><label for="mMust">Must contain (optional)</label><input type="text" id="mMust" placeholder="Text that only appears when the page renders properly"><span class="hint">Catches a blank or broken page that still returns HTTP 200.</span></div></div>
      <div class="row"><button class="btn" type="submit">Add monitor</button><button class="btn ghost" type="button" id="monCancel">Cancel</button></div></form>
    <section class="card"><header><h2>Monitors</h2><span>90 days · hover a bar for the day</span></header>
      ${d.monitors.map((m, i) => `<div class="mon"><div class="h"><span><span class="dot ${m.state}"></span> <b>${esc(m.name)}</b> <span class="pill ${m.state === "up" ? "good" : m.state === "down" ? "bad" : ""}">${m.state === "unknown" ? "Not checked" : m.state === "up" ? "Up" : "Down"}</span>${m.active ? "" : ' <span class="pill">Paused</span>'}</span>
        <span class="row">${canEdit() ? `<button class="btn sm ghost" type="button" data-check="${m.id}">Check now</button><button class="btn sm ghost" type="button" data-pause="${m.id}">${m.active ? "Pause" : "Resume"}</button>` : ""}${isAdmin() ? `<button class="btn sm danger" type="button" data-del="${m.id}">Delete</button>` : ""}</span></div>
        <a class="small mono" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.url)}</a>
        <div class="nums"><span>24 h <b>${m.up24 ?? "–"}${m.up24 != null ? "%" : ""}</b></span><span>7 days <b>${m.up7 ?? "–"}${m.up7 != null ? "%" : ""}</b></span><span>30 days <b>${m.up30 ?? "–"}${m.up30 != null ? "%" : ""}</b></span><span>90 days <b>${pct90(m)}</b></span><span>Avg response 24 h <b>${m.ms24 != null ? m.ms24 + " ms" : "–"}</b></span><span>Last check <b>${ago(m.last_checked)}</b></span></div>
        ${m.last_error ? `<span class="small" style="color:var(--bad)">Last error: ${esc(m.last_error)}</span>` : ""}
        <div id="mb-${i}"></div></div>`).join("") || `<div class="empty">No monitors yet.</div>`}
      <div class="legend"><span><i style="background:var(--good)"></i>99.5%+</span><span><i style="background:var(--gold)"></i>95–99.5%</span><span><i style="background:var(--bad)"></i>below 95%</span><span><i style="background:var(--none)"></i>no checks</span></div></section>
    <div class="cols">
      <section class="card"><header><h2>Response time</h2><span class="row" style="gap:8px">last 24 h <select id="rtSel" aria-label="Monitor">${d.monitors.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select></span></header><div id="rt"></div></section>
      <section class="card"><header><h2>SSL certificate</h2><span>checked daily</span></header>${d.ssl ? `<div class="kpi" style="border:0;padding:0"><span class="v">${d.ssl.daysLeft != null ? d.ssl.daysLeft + " days left" : "Unknown"}</span><span class="s">${d.ssl.validTo ? `Expires ${new Date(d.ssl.validTo).toDateString()} · ${esc(d.ssl.issuer || "")}` : esc(d.ssl.error || "")} · ${esc(d.ssl.host)} · checked ${ago(d.ssl.checkedAt)}</span></div>` : `<div class="empty">Not checked yet. The daily job checks it, or use Check SSL.</div>`}</section>
    </div>
    <section class="card"><header><h2>Incidents</h2><span>${d.incidents.length} recorded</span></header><div class="tbl"><table><thead><tr><th>Monitor</th><th>Started</th><th>Resolved</th><th>Duration</th><th>Cause</th></tr></thead><tbody>
      ${d.incidents.map((i) => `<tr><td>${esc(i.name)}${i.in_window ? ' <span class="pill info">planned maintenance</span>' : ""}</td><td class="small">${when(i.started_at)}</td><td class="small">${i.resolved_at ? when(i.resolved_at) : '<span class="pill bad">Ongoing</span>'}</td><td class="mono">${i.duration}</td><td>${esc(i.cause)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">No incidents. Good.</td></tr>`}
    </tbody></table></div></section>`;
  d.monitors.forEach((m, i) => uptimeBars(document.getElementById("mb-" + i), m.days));
  const drawRt = () => { const id = +document.getElementById("rtSel").value; lineChart(document.getElementById("rt"), d.recent.filter((c) => c.monitor_id === id).map((c) => ({ x: new Date(c.at), y: c.ms, label: new Date(c.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + (c.ok ? "" : " (failed)"), xLabel: new Date(c.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })), { height: 170, yFmt: (v) => v + " ms", emptyText: "No checks in the last 24 hours." }); };
  if (d.monitors.length) { drawRt(); document.getElementById("rtSel").addEventListener("change", drawRt); }
  if (canEdit()) {
    const f = document.getElementById("monForm");
    document.getElementById("addMon").onclick = () => { f.hidden = false; mName.focus(); };
    document.getElementById("monCancel").onclick = () => (f.hidden = true);
    f.addEventListener("submit", async (e) => { e.preventDefault(); try { await api("POST", "/monitors", { name: mName.value, url: mUrl.value, must_contain: mMust.value }); toast("Monitor added"); route(); } catch (x) { toast(x.message); } });
    document.getElementById("sslBtn").onclick = (e) => busy(e.target, async () => { await api("POST", "/ssl/check"); route(); });
  }
  view().addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const m = d.monitors.find((x) => x.id === +(b.dataset.check || b.dataset.pause || b.dataset.del));
    if (b.dataset.check) busy(b, async () => { const r = await api("POST", `/monitors/${m.id}/check`); toast(r.ok ? `Up · ${r.ms} ms` : `Failed: ${r.error}`); route(); });
    if (b.dataset.pause) busy(b, async () => { await api("PUT", `/monitors/${m.id}`, { name: m.name, url: m.url, must_contain: m.must_contain, active: !m.active }); route(); });
    if (b.dataset.del && confirm(`Delete the monitor ${m.name} and its history?`)) busy(b, async () => { await api("DELETE", `/monitors/${m.id}`); route(); });
  });
}
const pct90 = (m) => { const t = m.days.reduce((a, d) => a + d.total, 0), o = m.days.reduce((a, d) => a + d.ok, 0); return t ? Math.round((o / t) * 10000) / 100 + "%" : "–"; };

/* ---------- maintenance ---------- */
async function vMaintenance() {
  const rows = await api("GET", "/maintenance");
  const now = new Date();
  const windows = rows.filter((r) => r.kind === "window");
  const upcoming = windows.filter((w) => new Date(w.ends_at) >= now).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const logs = rows.filter((r) => r.kind === "log" || new Date(r.ends_at) < now);
  const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  view().innerHTML = `${head("Site health", "Maintenance <em>log</em>", "Schedule maintenance windows (downtime alerts are muted inside them) and keep a log of what was done to the site. Plugin, theme and WordPress version changes are logged automatically by the daily check.")}
    ${canEdit() ? `<div class="cols">
      <form class="card" id="winForm"><header><h3>Schedule a maintenance window</h3><span>alerts muted, team notified</span></header><div class="grid">
        <div class="field full"><label for="wTitle">What's happening</label><input type="text" id="wTitle" required placeholder="Monthly plugin updates on production"></div>
        <div class="field"><label for="wStart">Starts</label><input type="datetime-local" id="wStart" value="${local(new Date(Date.now() + 36e5))}"></div>
        <div class="field"><label for="wEnd">Ends</label><input type="datetime-local" id="wEnd" value="${local(new Date(Date.now() + 3 * 36e5))}"></div>
        <div class="field full"><label for="wNotes">Notes</label><textarea id="wNotes" placeholder="Who is doing it, rollback plan, backup taken?"></textarea></div></div>
        <div class="row"><button class="btn" type="submit">Schedule window</button></div></form>
      <form class="card" id="logForm"><header><h3>Log maintenance work</h3><span>becomes part of the site record</span></header><div class="grid">
        <div class="field full"><label for="gTitle">What was done</label><input type="text" id="gTitle" required placeholder="Full backup before Elementor 3.30 update"></div>
        <div class="field"><label for="gCat">Category</label><select id="gCat">${["updates", "backup", "security", "performance", "content", "hosting", "seo", "general"].map((c) => `<option>${c}</option>`).join("")}</select></div>
        <div class="field"><label for="gWhen">When</label><input type="datetime-local" id="gWhen" value="${local(new Date())}"></div>
        <div class="field full"><label for="gNotes">Details</label><textarea id="gNotes"></textarea></div></div>
        <div class="row"><button class="btn" type="submit">Add to log</button></div></form></div>` : ""}
    <section class="card"><header><h2>Upcoming and current windows</h2></header>${upcoming.length ? `<div class="tbl"><table><thead><tr><th>Window</th><th>Starts</th><th>Ends</th><th>By</th><th></th></tr></thead><tbody>
      ${upcoming.map((w) => `<tr><td><b>${esc(w.title)}</b>${new Date(w.starts_at) <= now ? ' <span class="pill warn">In progress</span>' : ""}${w.notes ? `<br><span class="small muted">${esc(w.notes)}</span>` : ""}</td><td class="small">${when(w.starts_at)}</td><td class="small">${when(w.ends_at)}</td><td>${esc(w.user_name || "–")}</td><td>${delBtn(w)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">No maintenance scheduled.</div>`}</section>
    <section class="card"><header><h2>Maintenance log</h2><span>${logs.length} entries</span></header><div class="tbl"><table><thead><tr><th>When</th><th>Work</th><th>Category</th><th>By</th><th></th></tr></thead><tbody>
      ${logs.map((r) => `<tr><td class="small">${when(r.starts_at)}</td><td><b>${esc(r.title)}</b>${r.kind === "window" ? ' <span class="pill info">window</span>' : ""}${r.notes ? `<br><span class="small muted" style="white-space:pre-line">${esc(r.notes)}</span>` : ""}</td><td><span class="pill">${esc(r.category)}</span></td><td>${r.auto ? '<span class="pill info">Detected automatically</span>' : esc(r.user_name || "–")}</td><td>${delBtn(r)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">Nothing logged yet.</td></tr>`}
    </tbody></table></div></section>`;
  const post = async (payload, msg) => { try { await api("POST", "/maintenance", payload); toast(msg); route(); } catch (x) { toast(x.message); } };
  document.getElementById("winForm")?.addEventListener("submit", (e) => { e.preventDefault(); post({ kind: "window", title: wTitle.value, notes: wNotes.value, starts_at: new Date(wStart.value).toISOString(), ends_at: new Date(wEnd.value).toISOString() }, "Window scheduled"); });
  document.getElementById("logForm")?.addEventListener("submit", (e) => { e.preventDefault(); post({ kind: "log", title: gTitle.value, notes: gNotes.value, category: gCat.value, starts_at: new Date(gWhen.value).toISOString() }, "Logged"); });
  view().addEventListener("click", (e) => { const b = e.target.closest("[data-mdel]"); if (b && confirm("Delete this entry?")) busy(b, async () => { await api("DELETE", `/maintenance/${b.dataset.mdel}`); route(); }); });
}
const delBtn = (r) => (canEdit() && !r.auto && (isAdmin() || r.user_id === me.id) ? `<button class="btn sm ghost" type="button" data-mdel="${r.id}">Delete</button>` : "");

/* ---------- plugins ---------- */
async function vPlugins() {
  const d = await api("GET", "/wp");
  const s = d.latest?.data;
  const pend = s ? s.plugins.filter((p) => p.update) : [];
  badges.updates = pend.length; renderNav();
  view().innerHTML = `${head("Site health", "Plugins and <em>updates</em>", "WordPress core, PHP, theme and plugin versions, read daily from the site. New updates trigger an alert, and installed version changes are logged in Maintenance automatically.",
    canEdit() && d.configured ? `<button class="btn" type="button" id="wpBtn">Check now</button>` : "")}
    ${!d.configured ? `<section class="card"><header><h2>Connect WordPress</h2></header><ol>
      <li>Upload the <b>Premier Visibility Connector</b> plugin (<span class="mono">visibility/wp-connector/</span> in the repo) to the site and activate it. It only reads; it never changes anything.</li>
      <li>Add <span class="mono">define( 'PREMIER_VISIBILITY_KEY', '…' );</span> to <span class="mono">wp-config.php</span> with a random value of 24+ characters.</li>
      <li>Set the same value as <span class="mono">WP_CONNECTOR_KEY</span> in the app's environment variables and redeploy.</li></ol></section>` : ""}
    ${s ? `<div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      <div class="kpi"><span class="l">WordPress</span><span class="v">${esc(s.core.version)}</span><span class="s">${s.core.update ? `<span class="pill warn">${esc(s.core.update)} available</span>` : "up to date"}</span></div>
      <div class="kpi"><span class="l">PHP</span><span class="v">${esc(s.php)}</span><span class="s">${parseFloat(s.php) < 8.1 ? '<span class="pill warn">below 8.1</span>' : "supported"}</span></div>
      <div class="kpi"><span class="l">Theme</span><span class="v" style="font-size:26px;letter-spacing:-.3px">${esc(s.theme.name)}</span><span class="s">${esc(s.theme.version)}${s.theme.update ? ` · <span class="pill warn">${esc(s.theme.update)} available</span>` : ""}</span></div>
      <div class="kpi"><span class="l">Plugin updates</span><span class="v">${pend.length}</span><span class="s">of ${s.plugins.length} plugins · checked ${ago(d.latest.at)}</span></div></div>
      ${s.debug ? `<div class="banner warn"><b>WP_DEBUG is on.</b> Turn it off on production once the error is fixed; it can expose file paths to visitors.</div>` : ""}
      <section class="card"><header><h2>Plugins</h2><span>updates first</span></header><div class="tbl"><table><thead><tr><th>Plugin</th><th>Installed</th><th>Available</th><th>Active</th><th>Auto-update</th></tr></thead><tbody>
        ${[...s.plugins].sort((a, b) => (!!b.update - !!a.update) || a.name.localeCompare(b.name)).map((p) => `<tr><td><b>${esc(p.name)}</b><br><span class="small muted">${esc(p.author || "")}</span></td><td class="mono">${esc(p.version)}</td><td>${p.update ? `<span class="pill ${p.security ? "bad" : "warn"}">${esc(p.update)}${p.security ? " · security" : ""}</span>` : '<span class="muted">up to date</span>'}</td><td>${p.active ? "Yes" : '<span class="muted">No</span>'}</td><td>${p.autoUpdate ? "On" : '<span class="muted">Off</span>'}</td></tr>`).join("")}
      </tbody></table></div><span class="hint">Inactive plugins still need updating or deleting: attackers target installed code whether or not it's active.</span></section>` : d.configured ? `<div class="empty">No data yet. Select Check now.</div>` : ""}
    <section class="card"><header><h2>Update history</h2></header><div class="feed">${feed(d.history)}</div></section>`;
  document.getElementById("wpBtn")?.addEventListener("click", (e) => busy(e.target, async () => { const r = await api("POST", "/wp/refresh"); toast(r.error ? r.error : "WordPress status updated"); route(); }));
}

/* ---------- playbook ---------- */
async function vPlaybook() {
  const md = (await api("GET", "/playbook")).markdown || "The playbook file is missing from app/playbook.md.";
  view().innerHTML = `<article class="md card" id="pb"></article>`;
  const pb = document.getElementById("pb");
  pb.innerHTML = window.marked ? window.marked.parse(md) : `<pre style="white-space:pre-wrap">${esc(md)}</pre>`;
  pb.querySelectorAll("table").forEach((t) => { const w = document.createElement("div"); w.className = "tw"; t.replaceWith(w); w.appendChild(t); });
  pb.querySelectorAll("a[href^='http']").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
}

/* ---------- settings ---------- */
async function vSettings() {
  const [s, notes, users] = await Promise.all([api("GET", "/settings"), api("GET", "/notifications"), isAdmin() ? api("GET", "/users") : Promise.resolve([])]);
  const ch = (ok, label, how) => `<tr><td>${label}</td><td>${ok ? '<span class="pill good">Configured</span>' : '<span class="pill warn">Not set</span>'}</td><td class="small muted">${how}</td></tr>`;
  view().innerHTML = `${head("Admin", "Team and <em>alerts</em>", "Who can sign in, where alerts go, and whether the scheduled checks are running.")}
    <div class="cols">
      <section class="card"><header><h2>Alerts</h2></header>
        <div class="tbl"><table><tbody>
          ${ch(s.channels.slack, "Slack", "SLACK_WEBHOOK_URL")}${ch(s.channels.email, "Email", "RESEND_API_KEY or USE_PHP_MAIL")}
          ${ch(s.channels.connector, "WordPress connector", "WP_CONNECTOR_KEY in app/config.php")}${ch(s.channels.cron, "Uptime cron job", s.lastCron.uptime ? `last ran ${ago(s.lastCron.uptime)}` : "hPanel → Cron Jobs → app/cron.php uptime")}${ch(!!s.lastCron.daily, "Daily cron job", s.lastCron.daily ? `last ran ${ago(s.lastCron.daily)}` : "hPanel → Cron Jobs → app/cron.php daily")}${ch(s.channels.heartbeat, "Outside heartbeat", "HEARTBEAT_URL (healthchecks.io)")}
        </tbody></table></div>
        ${isAdmin() ? `<form id="setForm" class="grid"><div class="field full"><label for="sEmails">Alert emails</label><input type="text" id="sEmails" value="${esc(s.alertEmails.join(", "))}" placeholder="jon@…, it@…"><span class="hint">Comma separated. Used when email alerts are configured.</span></div>
          <div class="field"><label for="sSsl">Warn when SSL expires within (days)</label><input type="text" id="sSsl" value="${s.sslWarnDays}" inputmode="numeric"></div>
          <div class="field full row"><button class="btn" type="submit">Save settings</button><button class="btn ghost" type="button" id="testBtn">Send test alert</button></div></form>` : ""}
      </section>
      <section class="card"><header><h2>Your account</h2><span>${esc(me.email)}</span></header>
        <form id="pwForm" class="grid"><div class="field"><label for="pwCur">Current password</label><input type="password" id="pwCur" autocomplete="current-password"></div>
          <div class="field"><label for="pwNew">New password</label><input type="password" id="pwNew" autocomplete="new-password" minlength="10"></div>
          <div class="field full"><button class="btn" type="submit">Change password</button></div></form>
        ${isAdmin() ? `<div class="row"><button class="btn ghost" type="button" id="exportBtn">Download all data (JSON)</button><button class="btn ghost" type="button" id="runBtn">Run the daily check now</button></div>` : ""}
      </section>
    </div>
    ${isAdmin() ? `<section class="card"><header><h2>Team</h2><span>admins manage everything · editors edit briefs and log work · viewers read only</span></header>
      <div class="tbl"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead><tbody>
        ${users.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><select data-role="${u.id}" aria-label="Role for ${esc(u.name)}" ${u.id === me.id ? "disabled" : ""}>${["admin", "editor", "viewer"].map((r) => `<option ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}</select></td>
          <td class="row">${u.id === me.id ? "" : `<button class="btn sm ghost" type="button" data-reset="${u.id}">Reset password</button><button class="btn sm danger" type="button" data-udel="${u.id}">Remove</button>`}</td></tr>`).join("")}</tbody></table></div>
      <form id="userForm" class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div class="field"><label for="uName">Name</label><input type="text" id="uName"></div><div class="field"><label for="uEmail">Email</label><input type="email" id="uEmail" required></div>
        <div class="field"><label for="uRole">Role</label><select id="uRole"><option>editor</option><option>viewer</option><option>admin</option></select></div><div class="field"><label for="uPass">Starting password</label><input type="text" id="uPass" minlength="10" required></div>
        <div class="field full"><button class="btn" type="submit">Add team member</button><span class="hint">Share the password privately. They can change it under Settings.</span></div></form></section>` : ""}
    <section class="card"><header><h2>Alert log</h2><span>last 200</span></header><div class="tbl"><table><thead><tr><th>When</th><th>Channel</th><th>Subject</th><th>Result</th></tr></thead><tbody>
      ${notes.map((n) => `<tr><td class="small">${when(n.at)}</td><td>${esc(n.channel)}</td><td>${esc(n.subject)}</td><td>${n.ok ? '<span class="pill good">Sent</span>' : `<span class="pill bad">Failed</span> <span class="small muted">${esc(n.error)}</span>`}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">No alerts sent yet.</td></tr>`}
    </tbody></table></div></section>`;
  document.getElementById("setForm")?.addEventListener("submit", async (e) => { e.preventDefault(); try { await api("PUT", "/settings", { alertEmails: sEmails.value, sslWarnDays: sSsl.value }); toast("Settings saved"); } catch (x) { toast(x.message); } });
  document.getElementById("testBtn")?.addEventListener("click", (e) => busy(e.target, async () => { const r = await api("POST", "/notifications/test"); toast(r.results.length ? r.results.map((x) => `${x.channel}: ${x.ok ? "sent" : x.error}`).join(" · ") : "No alert channel is configured yet"); route(); }));
  document.getElementById("pwForm").addEventListener("submit", async (e) => { e.preventDefault(); try { await api("PUT", "/me/password", { current: pwCur.value, next: pwNew.value }); toast("Password changed"); pwCur.value = pwNew.value = ""; } catch (x) { toast(x.message); } });
  document.getElementById("exportBtn")?.addEventListener("click", (e) => busy(e.target, async () => {
    const data = await api("GET", "/export"); const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = `premier-visibility-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  }));
  document.getElementById("runBtn")?.addEventListener("click", (e) => busy(e.target, async () => { const r = await api("POST", "/run/daily"); toast(`Done. ${r.audit?.length ?? 0} pages checked${r.wp?.error ? ` · WordPress: ${r.wp.error}` : ""}`); }));
  document.getElementById("userForm")?.addEventListener("submit", async (e) => { e.preventDefault(); try { await api("POST", "/users", { name: uName.value, email: uEmail.value, role: uRole.value, password: uPass.value }); toast("Team member added"); route(); } catch (x) { toast(x.message); } });
  view().addEventListener("change", async (e) => { const sel = e.target.closest("[data-role]"); if (sel) { try { await api("PUT", `/users/${sel.dataset.role}`, { role: sel.value }); toast("Role updated"); } catch (x) { toast(x.message); } } });
  view().addEventListener("click", async (e) => {
    const r = e.target.closest("[data-reset]"), d = e.target.closest("[data-udel]");
    if (r) { const pw = prompt("New password for this person (10+ characters):"); if (pw) { try { await api("PUT", `/users/${r.dataset.reset}`, { password: pw }); toast("Password reset"); } catch (x) { toast(x.message); } } }
    if (d && confirm("Remove this team member? Their past changes stay in the history.")) { try { await api("DELETE", `/users/${d.dataset.udel}`); route(); } catch (x) { toast(x.message); } }
  });
}

/* ---------- boot ---------- */
async function boot() {
  if (!me) { try { const r = await api("GET", "/me"); me = { ...r.user, site: r.site }; } catch { return; } }
  else if (!me.site) { try { const r = await api("GET", "/me"); me.site = r.site; } catch { return; } }
  shell(); route();
}
boot();
