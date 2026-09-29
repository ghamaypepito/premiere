// Small SVG charts: a single-series line with crosshair tooltip, and daily uptime status bars.
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

// points: [{x: Date, y: number|null, label: string}]
export function lineChart(host, points, { height = 180, yMin = 0, yMax = null, yFmt = (v) => v, ticks = 4, emptyText = "No data yet" } = {}) {
  host.innerHTML = "";
  host.classList.add("chart");
  const data = points.filter((p) => p.y != null);
  if (!data.length) { host.innerHTML = `<div class="empty">${emptyText}</div>`; return; }
  const W = 640, H = height, L = 40, R = 12, T = 10, B = 24;
  const x0 = +points[0].x, x1 = +points[points.length - 1].x || x0 + 1;
  const max = yMax ?? (Math.max(...data.map((p) => p.y)) * 1.15 || 1);
  const sx = (x) => L + ((+x - x0) / Math.max(1, x1 - x0)) * (W - L - R);
  const sy = (y) => T + (1 - (y - yMin) / (max - yMin)) * (H - T - B);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Line chart" });
  const g = el("g", { class: "axis" });
  for (let i = 0; i <= ticks; i++) {
    const v = yMin + ((max - yMin) * i) / ticks, y = sy(v);
    g.appendChild(el("line", { x1: L, x2: W - R, y1: y, y2: y, class: "gridline" }));
    const t = el("text", { x: L - 6, y: y + 3.5, "text-anchor": "end" }); t.textContent = yFmt(Math.round(v)); g.appendChild(t);
  }
  const fmtD = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].forEach((p, i) => {
    const t = el("text", { x: sx(p.x), y: H - 6, "text-anchor": i === 0 ? "start" : i === 2 ? "end" : "middle" });
    t.textContent = p.xLabel || fmtD(new Date(p.x)); g.appendChild(t);
  });
  svg.appendChild(g);
  // area + line, broken where y is null
  let d = "", area = "", seg = [];
  const flush = () => {
    if (!seg.length) return;
    d += seg.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
    area += `M${sx(seg[0].x).toFixed(1)},${sy(yMin)}` + seg.map((p) => `L${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("") + `L${sx(seg[seg.length - 1].x).toFixed(1)},${sy(yMin)}Z`;
    seg = [];
  };
  points.forEach((p) => (p.y == null ? flush() : seg.push(p))); flush();
  svg.appendChild(el("path", { d: area, fill: "var(--series)", opacity: ".08" }));
  svg.appendChild(el("path", { d, fill: "none", stroke: "var(--series)", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
  const last = data[data.length - 1];
  svg.appendChild(el("circle", { cx: sx(last.x), cy: sy(last.y), r: 4, fill: "var(--series)", stroke: "var(--surface)", "stroke-width": 2 }));
  const cross = el("line", { y1: T, y2: H - B, stroke: "var(--muted)", "stroke-width": 1, "stroke-dasharray": "3 3", visibility: "hidden" });
  const dot = el("circle", { r: 4, fill: "var(--series)", stroke: "var(--surface)", "stroke-width": 2, visibility: "hidden" });
  svg.append(cross, dot);
  const hit = el("rect", { x: L, y: 0, width: W - L - R, height: H, fill: "transparent" });
  svg.appendChild(hit);
  host.appendChild(svg);
  const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
  const move = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    let best = null, bd = Infinity;
    for (const p of data) { const dd = Math.abs(sx(p.x) - px); if (dd < bd) { bd = dd; best = p; } }
    if (!best) return;
    const cx = sx(best.x), cy = sy(best.y);
    cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.setAttribute("visibility", "visible");
    dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("visibility", "visible");
    tip.innerHTML = `${best.label || fmtD(new Date(best.x))}: <b>${yFmt(best.y)}</b>`;
    tip.style.left = (cx / W) * r.width + "px"; tip.style.top = (cy / H) * r.height + "px"; tip.hidden = false;
  };
  const leave = () => { cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); tip.hidden = true; };
  hit.addEventListener("pointermove", move); hit.addEventListener("pointerleave", leave);
}

// days: [{day:'YYYY-MM-DD', total, ok}]
export function uptimeBars(host, days) {
  host.innerHTML = "";
  host.classList.add("ubars");
  host.style.position = "relative";
  const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true;
  days.forEach((d) => {
    const i = document.createElement("i");
    const pct = d.total ? (d.ok / d.total) * 100 : null;
    i.className = pct == null ? "" : pct >= 99.5 ? "good" : pct >= 95 ? "warn" : "bad";
    const label = `${new Date(d.day + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${pct == null ? "no checks" : pct.toFixed(pct === 100 ? 0 : 2) + "% up"}${d.total && d.ok < d.total ? ` · ${d.total - d.ok} failed check${d.total - d.ok > 1 ? "s" : ""}` : ""}`;
    i.setAttribute("aria-label", label); i.tabIndex = 0;
    const show = () => { tip.textContent = label; tip.style.left = i.offsetLeft + i.offsetWidth / 2 + "px"; tip.style.top = "0px"; tip.hidden = false; };
    i.addEventListener("pointerenter", show); i.addEventListener("focus", show);
    i.addEventListener("pointerleave", () => (tip.hidden = true)); i.addEventListener("blur", () => (tip.hidden = true));
    host.appendChild(i);
  });
  host.appendChild(tip);
}
