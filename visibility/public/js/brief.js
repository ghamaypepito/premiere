// The SEO/AEO brief editor. Renders the form and live score panel for one page.
import { MARKETS, SCHEMAS, TECH, TARGET_WORDS, lines, words, esc, norm, countPhrase, textStats, evaluate, scoreOf, jsonld, tmplFor } from "./rules.js";

export function mountBrief(root, brief, { readOnly = false, onChange = () => {} } = {}) {
  const b = structuredClone(brief);
  b.faqs = b.faqs || []; b.markets = b.markets || []; b.schema = b.schema || []; b.tech = b.tech || {};
  const t = tmplFor(b);
  const dis = readOnly ? "disabled" : "";
  const F = (id, label, { kind = "text", hint = "", full = false, cls = "", ph = "", counter = false, opts = null } = {}) => {
    const v = esc(b[id] ?? "");
    let ctl;
    if (kind === "textarea") ctl = `<textarea id="f-${id}" data-f="${id}" class="${cls}" placeholder="${esc(ph)}" ${dis}>${v}</textarea>`;
    else if (opts) ctl = `<select id="f-${id}" data-f="${id}" ${dis}>${opts.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(b[id] ?? "") === val ? "selected" : ""}>${esc(lab)}</option>`; }).join("")}</select>`;
    else ctl = `<input type="${kind}" id="f-${id}" data-f="${id}" value="${v}" placeholder="${esc(ph)}" ${dis}>`;
    return `<div class="field${full ? " full" : ""}"><label for="f-${id}">${label}</label>${ctl}${counter ? `<span class="cnt" id="c-${id}"></span>` : ""}${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  };
  const card = (title, sub, inner) => { const [no, name] = title.split(" · "); return `<section class="card step"><header><h3><span class="no">${no.padStart(2, "0")}</span>${name}</h3><span>${sub}</span></header>${inner}</section>`; };

  root.innerHTML = `<div class="editor"><main>
  ${card("1 · Page setup", "Who owns it, where it lives, who it is for", `<div class="grid">
    ${F("name", "Page name")}${F("url", "URL", { ph: "/what-we-do/succession-planning/" })}
    ${F("type", "Page type", { opts: [["home","Home"],["service","Service pillar"],["about","About / team"],["profile","Person profile"],["hub","Hub / listing"],["article","Article (cluster)"],["event","Event"],["faq","FAQ"],["contact","Contact / booking"],["legal","Legal"]] })}
    ${F("status", "Status", { opts: ["Not started","Drafting","In review","Ready","Published"] })}
    ${F("owner", "Content owner", { ph: "Who writes it" })}
    ${F("intent", "Search intent", { opts: [["","Choose…"],"Informational","Commercial investigation","Transactional","Navigational"], hint: "What the searcher wants: learn, compare, act, or find Premier." })}
    <div class="field full"><span class="lbl">Target markets</span><div class="checks">${MARKETS.map((m, i) => `<label><input type="checkbox" id="mk-${i}" data-m="${esc(m)}" ${b.markets.includes(m) ? "checked" : ""} ${dis}>${esc(m)}</label>`).join("")}</div>
    <span class="hint">Keep the primary keyword country-free so the page can rank anywhere. Put the geography in secondary keywords and schema.</span></div></div>`)}
  ${card("2 · Keywords", "One primary, a handful of secondary, the questions people ask", `<div class="sugg" id="sugg"></div><div class="grid">
    ${F("primary", "Primary keyword", { full: true, hint: "Check its volume in Keyword Planner or Semrush before you lock it." })}
    ${F("volume", "Monthly volume (global / PH)", { ph: "e.g. 1,900 / 170 (Semrush, Oct 2026)" })}${F("competitor", "Top-ranking competitor for it", { ph: "URL in position 1 today" })}
    ${F("secondary", "Secondary keywords · one per line", { kind: "textarea" })}${F("questions", "Questions to answer (AEO) · one per line", { kind: "textarea" })}
    ${F("entities", "Entities to mention · one per line", { kind: "textarea", full: true, hint: "People, credentials, places and organisations that search engines and LLMs should connect to Premier." })}</div>`)}
  ${card("3 · Search appearance", "Title, description, social card", `<div class="serp"><span class="u" id="pvU"></span><span class="t" id="pvT"></span><span class="d" id="pvD"></span></div><div class="grid">
    ${F("seoTitle", "SEO title", { full: true, counter: true })}${F("metaDesc", "Meta description", { kind: "textarea", full: true, counter: true })}
    ${F("ogImage", "Social / OG image file name", { ph: "family-council-meeting.jpg" })}${F("ogAlt", "OG image alt text")}</div>`)}
  ${card("4 · Content", "H1, direct answer, outline and copy", `<div class="grid">
    ${F("h1", "H1", { full: true })}
    ${F("answer", "Direct answer · the first 40–60 words under the H1", { kind: "textarea", full: true, counter: true, hint: "Write it so it still makes sense when an AI engine quotes it alone." })}
    ${F("outline", "Outline · \"## \" for H2, \"### \" for H3", { kind: "textarea", full: true, ph: "## How long does family business succession take?" })}
    ${F("body", "Body copy · paste the draft to score it", { kind: "textarea", full: true, cls: "tall" })}</div><div class="stats" id="stats"></div>`)}
  ${card("5 · Answer-engine readiness", "FAQs, proof and who stands behind the page", `<div class="field"><span class="lbl">FAQs · become FAQPage schema</span><div id="faqs" class="checks col" style="gap:12px"></div>
    ${readOnly ? "" : `<div class="row"><button class="btn sm ghost" type="button" data-act="addFaq">Add FAQ</button><button class="btn sm ghost" type="button" data-act="faqFromQ">Add FAQs from question list</button></div>`}</div>
    <div class="grid">${F("takeaways", "Key takeaways · one per line", { kind: "textarea" })}${F("proof", "Stats and sources · \"claim | source URL\"", { kind: "textarea" })}
    ${F("author", "Author", { ph: "Jonathan A. Ramos" })}${F("creds", "Author credentials", { ph: "RFC, CFWA · FFI Fellow" })}
    ${F("reviewer", "Expert reviewer")}${F("reviewed", "Last reviewed", { kind: "date" })}</div>`)}
  ${card("6 · Links and media", "\"anchor text | URL\" and \"file-name.jpg | alt text\"", `<div class="grid">
    ${F("internal", "Internal links", { kind: "textarea", ph: "family governance consulting | /what-we-do/family-governance/" })}${F("external", "External sources", { kind: "textarea", ph: "Family Firm Institute | https://www.ffi.org/" })}
    ${F("images", "Images", { kind: "textarea", full: true, ph: "family-business-succession-handover.jpg | Founder handing keys to his daughter" })}</div>`)}
  ${card("7 · Schema and technical", "Tick when done on the live page", `<div class="field"><span class="lbl">Structured data (★ = suggested for this page)</span><div class="checks">${SCHEMAS.map((s) => `<label><input type="checkbox" id="sc-${s}" data-s="${s}" ${b.schema.includes(s) ? "checked" : ""} ${dis}>${s}${(t.schema || []).includes(s) ? " ★" : ""}</label>`).join("")}</div></div>
    <div class="field"><span class="lbl">Technical checklist</span><div class="checks col">${TECH.map(([k, l]) => `<label><input type="checkbox" id="tc-${k}" data-t="${k}" ${b.tech[k] ? "checked" : ""} ${dis}>${esc(l)}</label>`).join("")}</div></div>
    <div class="field"><div class="row" style="justify-content:space-between"><span class="lbl">Generated JSON-LD · paste into Elementor custom code or Rank Math</span><button class="btn sm" type="button" data-act="copyLd">Copy JSON-LD</button></div><pre class="code" id="ld"></pre></div>`)}
  </main>
  <aside class="scorepanel" aria-label="Readiness score">
    <div class="top"><svg class="dial" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="36" fill="none" stroke="var(--sunk)" stroke-width="8"></circle><circle id="dialArc" cx="42" cy="42" r="36" fill="none" stroke="var(--accent)" stroke-width="8" stroke-dasharray="0 999" transform="rotate(-90 42 42)"></circle><text id="dialTxt" x="42" y="48" text-anchor="middle" font-size="19">0</text></svg>
    <div><b id="verdict">Not ready</b><span class="small" id="verdictSub"></span></div></div>
    <div class="groups" id="groups"></div><div class="issues" id="issues"></div>
  </aside></div>`;

  const $ = (id) => root.querySelector("#" + id);
  const changed = () => { analyse(); onChange(structuredClone(b)); };

  function renderSugg() {
    const sec = lines(b.secondary).map(norm), qs = lines(b.questions).map(norm), en = lines(b.entities).map(norm);
    const chip = (x, kind, used) => `<button type="button" class="chip${used ? " used" : ""}" data-kind="${kind}" data-v="${esc(x)}" ${used || readOnly ? "disabled" : ""}>${esc(x)}</button>`;
    let h = `<div class="row" style="justify-content:space-between"><span class="lbl">Suggested for this page${readOnly ? "" : " · select to add"}</span>${t.p && norm(b.primary) !== norm(t.p) && !readOnly ? `<button type="button" class="chip" data-kind="primary" data-v="${esc(t.p)}">Use primary: ${esc(t.p)}</button>` : ""}</div>`;
    if (t.s?.length) h += `<span class="hint">Secondary</span><div class="chips">${t.s.map((x) => chip(x, "secondary", sec.includes(norm(x)))).join("")}</div>`;
    if (t.q?.length) h += `<span class="hint">Questions</span><div class="chips">${t.q.map((x) => chip(x, "questions", qs.includes(norm(x)))).join("")}</div>`;
    if (t.e?.length) h += `<span class="hint">Entities</span><div class="chips">${t.e.map((x) => chip(x, "entities", en.includes(norm(x)))).join("")}</div>`;
    if (t.s?.length && !readOnly) h += `<div class="row"><button type="button" class="btn sm" data-act="addAll">Add all suggestions</button></div>`;
    $("sugg").innerHTML = h;
  }
  function renderFaqs() {
    $("faqs").innerHTML = b.faqs.map((f, i) => `<div class="faq"><div class="field"><label for="fq-${i}">Question ${i + 1}</label><input type="text" id="fq-${i}" data-faq="${i}" data-k="q" value="${esc(f.q)}" ${dis}>
      <label for="fa-${i}">Answer</label><textarea id="fa-${i}" data-faq="${i}" data-k="a" ${dis}>${esc(f.a)}</textarea><span class="cnt" id="fc-${i}"></span></div>
      ${readOnly ? "" : `<button type="button" class="btn sm ghost" data-delfaq="${i}" aria-label="Remove question ${i + 1}">Remove</button>`}</div>`).join("") || `<span class="hint">No FAQs yet. Service pages and articles need three or more.</span>`;
    faqCounts();
  }
  function faqCounts() { b.faqs.forEach((f, i) => { const e = $("fc-" + i); if (e) { const n = words(f.a).length; e.textContent = `${n} words · aim 20–100`; e.className = "cnt " + (n >= 20 && n <= 100 ? "good" : n ? "warn" : ""); } }); }
  const counter = (id, n, lo, hi, unit) => { const e = $("c-" + id); if (e) { e.textContent = `${n} ${unit} · aim ${lo}–${hi}`; e.className = "cnt " + (n >= lo && n <= hi ? "good" : n ? "warn" : ""); } };

  function analyse() {
    counter("seoTitle", b.seoTitle.length, 30, 60, "characters");
    counter("metaDesc", b.metaDesc.length, 120, 160, "characters");
    counter("answer", words(b.answer).length, 40, 60, "words");
    $("pvU").textContent = "premierfamilybusiness.com" + (b.url || "/").replace(/\/$/, "").replace(/\//g, " › ");
    $("pvT").textContent = b.seoTitle ? (b.seoTitle.length > 60 ? b.seoTitle.slice(0, 58) + "…" : b.seoTitle) : "Your SEO title shows here";
    $("pvD").textContent = b.metaDesc ? (b.metaDesc.length > 160 ? b.metaDesc.slice(0, 157) + "…" : b.metaDesc) : "Your meta description shows here. Without one, Google picks a sentence from the page.";
    const st = textStats(b.body), P = b.primary.trim();
    const dens = P && st.wc ? ((countPhrase(b.body, P) * words(P).length) / st.wc * 100).toFixed(2) + "%" : "–";
    $("stats").innerHTML = [[st.wc, `words (target ${TARGET_WORDS[b.type] ?? 600})`], [P ? countPhrase(b.body, P) : "–", "primary keyword uses"], [dens, "keyword density"], [st.wc ? st.flesch : "–", "reading ease (60+ is plain English)"]]
      .map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");
    const R = evaluate(b), sc = scoreOf(R), C = 2 * Math.PI * 36;
    $("dialArc").setAttribute("stroke-dasharray", `${(C * sc.total) / 100} ${C}`);
    $("dialArc").setAttribute("stroke", sc.total >= 80 && !sc.fails ? "var(--good)" : sc.total >= 50 ? "var(--accent)" : "var(--bad)");
    $("dialTxt").textContent = sc.total + "%";
    $("verdict").textContent = sc.total >= 80 && !sc.fails ? "Ready to publish" : sc.total >= 50 ? "Getting there" : "Not ready";
    $("verdictSub").textContent = sc.fails ? `${sc.fails} red item${sc.fails > 1 ? "s" : ""} to fix` : "80% with no red items is ready";
    $("groups").innerHTML = Object.entries(sc.groups).map(([k, v]) => { const p = Math.round((v.p / v.n) * 100); return `<div class="gr"><span>${k}</span><span class="bar"><i style="width:${p}%"></i></span><span class="v">${p}%</span></div>`; }).join("");
    const ord = { fail: 0, warn: 1, pass: 2 }; let last = null, h = "";
    [...R].sort((a, c) => ord[a.state] - ord[c.state]).forEach((r) => {
      if (r.state !== last) { h += `<h4>${r.state === "fail" ? "Fix" : r.state === "warn" ? "Improve" : "Done"}</h4>`; last = r.state; }
      h += `<div class="is ${r.state}"><span class="ic">${r.state === "pass" ? "✓" : r.state === "warn" ? "!" : "×"}</span><span>${esc(r.label)}<small>${esc(r.g)} · ${esc(r.hint)}</small></span></div>`;
    });
    $("issues").innerHTML = h;
    $("ld").textContent = JSON.stringify(jsonld(b), null, 2);
  }
  const appendLine = (field, v) => { const ls = lines(b[field]); if (!ls.map(norm).includes(norm(v))) { ls.push(v); b[field] = ls.join("\n"); const e = $("f-" + field); if (e) e.value = b[field]; } };

  root.addEventListener("input", (e) => {
    const x = e.target;
    if (x.dataset.f) { b[x.dataset.f] = x.value; if (["secondary", "questions", "entities", "primary"].includes(x.dataset.f)) renderSugg(); }
    else if (x.dataset.faq !== undefined) { b.faqs[+x.dataset.faq][x.dataset.k] = x.value; faqCounts(); }
    else return;
    changed();
  });
  root.addEventListener("change", (e) => {
    const x = e.target;
    if (x.dataset.m !== undefined) b.markets = [...root.querySelectorAll("[data-m]:checked")].map((y) => y.dataset.m);
    else if (x.dataset.s !== undefined) b.schema = [...root.querySelectorAll("[data-s]:checked")].map((y) => y.dataset.s);
    else if (x.dataset.t !== undefined) b.tech = { ...b.tech, [x.dataset.t]: x.checked };
    else return;
    changed();
  });
  root.addEventListener("click", (e) => {
    const x = e.target.closest("button"); if (!x) return;
    if (x.dataset.act === "copyLd") { copyText(`<script type="application/ld+json">\n${$("ld").textContent}\n<\/script>`, "JSON-LD"); return; }
    if (readOnly) return;
    if (x.dataset.kind) { if (x.dataset.kind === "primary") { b.primary = x.dataset.v; $("f-primary").value = b.primary; } else appendLine(x.dataset.kind, x.dataset.v); renderSugg(); changed(); }
    else if (x.dataset.act === "addAll") { (t.s || []).forEach((v) => appendLine("secondary", v)); (t.q || []).forEach((v) => appendLine("questions", v)); (t.e || []).forEach((v) => appendLine("entities", v)); if (!b.primary && t.p) { b.primary = t.p; $("f-primary").value = t.p; } renderSugg(); changed(); }
    else if (x.dataset.act === "addFaq") { b.faqs.push({ q: "", a: "" }); renderFaqs(); changed(); $("fq-" + (b.faqs.length - 1))?.focus(); }
    else if (x.dataset.act === "faqFromQ") { const have = b.faqs.map((f) => norm(f.q)); lines(b.questions).forEach((q) => { if (!have.includes(norm(q))) b.faqs.push({ q, a: "" }); }); renderFaqs(); changed(); }
    else if (x.dataset.delfaq !== undefined) { b.faqs.splice(+x.dataset.delfaq, 1); renderFaqs(); changed(); }
  });

  renderSugg(); renderFaqs(); analyse();
  return { get: () => structuredClone(b) };
}

export async function copyText(text, label) {
  try { await navigator.clipboard.writeText(text); window.toast?.(`${label} copied`); }
  catch { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove(); window.toast?.(ok ? `${label} copied` : "Copy was blocked. Select the text and copy it by hand."); }
}
