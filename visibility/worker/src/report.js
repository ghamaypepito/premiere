// Public visibility report (/report): uptime, incidents and SEO/AEO readiness, readable without signing in.
// Shows nothing sensitive: no plugin versions, brief contents, team names or alert settings.
import { q, one, iso, dj, siteUrl, ensureSeed } from "./util.js";
import { uptimeStats, pagesWithLive } from "./api.js";
import { LOGO_WHITE } from "./logo.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" }) + " PHT" : "–");
const pct = (v) => (v == null ? "–" : `${v}%`);

export async function renderReport(env) {
  await ensureSeed(env);
  const [monitors, pages, incidents] = await Promise.all([
    uptimeStats(env, 90), pagesWithLive(env),
    q(env, "SELECT i.started_at, i.resolved_at, i.cause, i.in_window, m.name FROM incidents i JOIN monitors m ON m.id=i.monitor_id WHERE i.started_at >= ? ORDER BY i.started_at DESC LIMIT 12", iso(-90 * 864e5)),
  ]);
  const down = monitors.filter((m) => m.active && m.state === "down");
  const live = pages.filter((p) => !p.no_live);
  const avg = pages.length ? Math.round(pages.reduce((a, p) => a + p.score, 0) / pages.length) : 0;
  const ready = pages.filter((p) => p.score >= 80 && !p.fails).length;
  const checked = live.filter((p) => p.live_at);
  const liveOk = checked.filter((p) => p.live_status >= 200 && p.live_status < 400 && !p.live_noindex).length;
  const liveIssues = checked.length - liveOk;
  const home = monitors[0];
  const status = down.length ? { cls: "bad", text: `${down.map((m) => m.name).join(", ")} ${down.length > 1 ? "are" : "is"} down` }
    : monitors.some((m) => m.state === "unknown") ? { cls: "warn", text: "Checks are starting" } : { cls: "good", text: "All systems operational" };

  const bars = (m) => m.days.map((d) => {
    const p = d.total ? (d.ok / d.total) * 100 : null;
    const cls = p == null ? "" : p >= 99.5 ? "g" : p >= 95 ? "w" : "b";
    return `<i class="${cls}" title="${esc(d.day)}: ${p == null ? "no checks" : p.toFixed(p === 100 ? 0 : 2) + "% up"}"></i>`;
  }).join("");
  const scoreColor = (s, f) => (s >= 80 && !f ? "#2E6B4E" : s >= 50 ? "#193153" : "#A23A2E");
  const livePill = (p) => p.no_live ? `<span class="pill">Template</span>` : !p.live_at ? `<span class="pill">Not checked yet</span>`
    : p.live_status >= 400 || !p.live_status ? `<span class="pill b">HTTP ${p.live_status || "error"}</span>` : p.live_noindex ? `<span class="pill b">Hidden from Google</span>` : `<span class="pill g">Live</span>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Premier Visibility Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..500;1,6..72,300..500&family=Poppins:wght@400;500;600&display=swap">
<style>
:root{--navy:#193153;--deep:#142948;--gold:#F2AF11;--paper:#F7F6F2;--text:#3E4756;--muted:#5F6674;--rule:#E6E2D9;--good:#2E6B4E;--bad:#A23A2E;--warn:#8A5A0B;--none:#DDD8CC;color-scheme:light}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--text);font-family:Poppins,"Segoe UI",Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6}
h1,h2{font-family:Newsreader,Georgia,serif;font-weight:400;color:var(--navy);margin:0;letter-spacing:-.5px;text-wrap:balance}
header.top{background:var(--navy);border-bottom:3px solid var(--gold)}
header.top div{max-width:1100px;margin:0 auto;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
header.top img{height:26px;width:auto}header.top span{color:#DCE3EE;font-size:13px}
main{max-width:1100px;margin:0 auto;padding:40px 24px 64px;display:flex;flex-direction:column;gap:28px}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:2.2px;text-transform:uppercase;color:var(--muted)}
.hero h1{font-size:46px;line-height:1.05;margin-top:10px}.hero h1 em{font-style:italic}.hero p{margin:12px 0 0;max-width:66ch;font-size:16px}
.status{display:flex;align-items:center;gap:12px;padding:18px 22px;background:#fff;border:1px solid var(--rule);border-left:3px solid var(--good);font-weight:600;color:var(--navy)}
.status.bad{border-left-color:var(--bad);background:#F8E4E0;color:var(--bad)}.status.warn{border-left-color:var(--gold)}
.dot{width:10px;height:10px;border-radius:50%;background:var(--good);display:inline-block}.status.bad .dot{background:var(--bad)}.status.warn .dot{background:var(--gold)}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:#fff;border:1px solid var(--rule)}
.kpi{padding:20px 22px;border-top:2px solid var(--navy);border-left:1px solid var(--rule)}.kpi:first-child{border-left:0}
.kpi .l{font-size:11.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--muted)}
.kpi .v{font-family:Newsreader,Georgia,serif;font-size:42px;color:var(--navy);line-height:1.1;font-variant-numeric:lining-nums tabular-nums}.kpi .s{font-size:13px;color:var(--muted)}
.card{background:#fff;border:1px solid var(--rule);padding:26px}.card h2{font-size:26px;margin-bottom:14px}
.mon{padding:14px 0;border-bottom:1px solid var(--rule)}.mon:last-child{border-bottom:0}
.mon .h{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:14px}.mon .h b{color:var(--navy)}
.bars{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:2px;height:30px;margin-top:10px}
.bars i{background:var(--none)}.bars i.g{background:var(--good)}.bars i.w{background:var(--gold)}.bars i.b{background:var(--bad)}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:10px}.legend i{display:inline-block;width:10px;height:10px;margin-right:5px;vertical-align:-1px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:11px 10px;border-bottom:1px solid var(--rule);vertical-align:top}
th{font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:var(--muted);font-weight:600}td b{color:var(--navy);font-weight:600}
.tbl{overflow-x:auto}.meter{display:flex;align-items:center;gap:8px;min-width:120px}.meter span{flex:1;height:4px;background:var(--rule)}.meter span i{display:block;height:100%}
.pill{display:inline-block;font-size:12px;font-weight:500;padding:2px 9px;background:var(--paper);color:var(--muted);white-space:nowrap}
.pill.g{background:#E6EFE9;color:var(--good)}.pill.b{background:#F8E4E0;color:var(--bad)}
.muted{color:var(--muted)}footer{max-width:1100px;margin:0 auto;padding:0 24px 40px;font-size:12.5px;color:var(--muted)}
@media(max-width:760px){.hero h1{font-size:34px}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.kpi:nth-child(3){border-left:0}.card{padding:18px}main{padding:28px 16px 48px}header.top div{padding:14px 16px}}
</style></head><body>
<header class="top"><div><img src="data:image/png;base64,${LOGO_WHITE}" alt="Premier Family Business Consulting" width="151" height="26"><span>Visibility report · ${esc(new URL(siteUrl(env)).hostname)}</span></div></header>
<main>
<section class="hero"><span class="eyebrow">Website health and search readiness</span><h1>Premier Visibility <em>report</em></h1>
<p>How ${esc(new URL(siteUrl(env)).hostname)} is performing: uptime checked every five minutes from Cloudflare's network, and how ready each page is for search engines and AI answer engines. Updated ${esc(fmtDate(iso()))}.</p></section>
<div class="status ${status.cls}"><span class="dot"></span>${esc(status.text)}</div>
<div class="kpis">
  <div class="kpi"><div class="l">Uptime · 30 days</div><div class="v">${pct(home?.up30)}</div><div class="s">${home ? esc(home.name) : "No monitors"}</div></div>
  <div class="kpi"><div class="l">Uptime · 90 days</div><div class="v">${pct(home?.up90)}</div><div class="s">${incidents.filter((i) => !i.in_window).length} incident${incidents.length === 1 ? "" : "s"} in 90 days</div></div>
  <div class="kpi"><div class="l">SEO &amp; AEO readiness</div><div class="v">${avg}%</div><div class="s">${ready} of ${pages.length} pages ready to publish</div></div>
  <div class="kpi"><div class="l">Live pages healthy</div><div class="v">${liveOk}/${checked.length}</div><div class="s">${liveIssues ? `${liveIssues} with errors or hidden from Google` : "no live issues found"}</div></div>
</div>
<section class="card"><h2>Uptime</h2>
${monitors.filter((m) => m.active).map((m) => `<div class="mon"><div class="h"><span><b>${esc(m.name)}</b> <span class="muted">· ${m.state === "up" ? "Up" : m.state === "down" ? "Down" : "Not checked yet"}</span></span><span class="muted">30 days ${pct(m.up30)} · 90 days ${pct(m.up90)}</span></div><div class="bars" role="img" aria-label="Daily uptime for ${esc(m.name)}, last 90 days">${bars(m)}</div></div>`).join("")}
<div class="legend"><span><i style="background:var(--good)"></i>99.5%+</span><span><i style="background:var(--gold)"></i>95–99.5%</span><span><i style="background:var(--bad)"></i>below 95%</span><span><i style="background:var(--none)"></i>no checks</span></div></section>
<section class="card"><h2>Incidents · last 90 days</h2>${incidents.length ? `<div class="tbl"><table><thead><tr><th>What</th><th>Started</th><th>Resolved</th><th>Cause</th></tr></thead><tbody>
${incidents.map((i) => `<tr><td><b>${esc(i.name)}</b>${i.in_window ? ' <span class="pill">planned maintenance</span>' : ""}</td><td>${esc(fmtDate(i.started_at))}</td><td>${i.resolved_at ? esc(fmtDate(i.resolved_at)) : '<span class="pill b">Ongoing</span>'}</td><td>${esc(i.cause)}</td></tr>`).join("")}
</tbody></table></div>` : `<p class="muted" style="margin:0">No incidents recorded.</p>`}</section>
<section class="card"><h2>Pages</h2><p class="muted" style="margin:0 0 14px">Readiness scores each page's SEO and answer-engine brief: keywords, title and description, content, FAQs, schema and links. Live status comes from a daily check of what the page actually serves.</p>
<div class="tbl"><table><thead><tr><th>Page</th><th>Readiness</th><th>Live page</th><th>Last checked</th></tr></thead><tbody>
${[...pages].sort((a, b) => b.score - a.score).map((p) => `<tr><td><b>${esc(p.name)}</b><br><span class="muted" style="font-size:12.5px">${esc(p.url)}</span></td><td><div class="meter"><span><i style="width:${p.score}%;background:${scoreColor(p.score, p.fails)}"></i></span>${p.score}%</div></td><td>${livePill(p)}</td><td class="muted">${esc(p.live_at ? fmtDate(p.live_at) : "–")}</td></tr>`).join("")}
</tbody></table></div></section>
</main>
<footer>Premier Family Business Consulting · Generated by Premier Visibility. Uptime is measured from Cloudflare's network, independently of the website's server.</footer>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300", "x-robots-tag": "noindex, nofollow", "x-frame-options": "DENY" } });
}
