// Paper $1K: Scriptable widget for Colin's hypothetical $1,000 portfolio test.
// Data: portfolio.json in github.com/colinspel/colinspel (updated by the open, pre-close and close runs).
// Sizes: small, medium, large. Tap the widget to open the full interactive dashboard.
// Also fires an iPhone notification the first time it sees a new planned BUY or SELL.

const DATA_URL =
  "https://raw.githubusercontent.com/colinspel/colinspel/main/paper-portfolio/portfolio.json";
const CACHE_FILE = "paper1k-cache.json";
const SEEN_FILE = "paper1k-seen-moves.json";

const C = {
  bgTop: new Color("#0B1220"),
  bgBot: new Color("#121C33"),
  card: new Color("#FFFFFF", 0.06),
  text: new Color("#F4F6FB"),
  dim: new Color("#8C97B2"),
  green: new Color("#2BD67B"),
  red: new Color("#FF5C6C"),
  amber: new Color("#FFB547"),
  spy: new Color("#7C8BFF"),
  line: new Color("#FFFFFF", 0.12),
};

// ---------- data ----------
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
const seenPath = fm.joinPath(fm.documentsDirectory(), SEEN_FILE);

async function loadData() {
  try {
    const req = new Request(DATA_URL + "?t=" + Date.now());
    req.timeoutInterval = 15;
    const d = await req.loadJSON();
    fm.writeString(cachePath, JSON.stringify(d));
    d._offline = false;
    return d;
  } catch (e) {
    if (fm.fileExists(cachePath)) {
      const d = JSON.parse(fm.readString(cachePath));
      d._offline = true;
      return d;
    }
    return null;
  }
}

// Which portfolio a widget shows (the widget's Parameter):
//   empty or "compare": Momentum vs Core on medium/large (small and lock screen show Momentum)
//   "momentum": Momentum only   "core": Core only
const VIEW = (
  (typeof args !== "undefined" && ((args.queryParameters && args.queryParameters.view) || args.widgetParameter)) || ""
).trim().toLowerCase();

function viewOf(data, which) {
  if (which === "core" && data && data.core) {
    const c = Object.assign({}, data.core);
    c._offline = data._offline;
    c._kind = "core";
    c.tag = c.tag || "CORE";
    return c;
  }
  const a = Object.assign({}, data);
  a._kind = "momentum";
  a._core = data.core || null;
  a.tag = a.tag || "P1K";
  return a;
}

async function notifyNewMoves(d) {
  const label = (x, src) => Object.assign({}, x, { _src: src });
  const pending = [
    ...((d && d.pending) || []).map((x) => label(x, "")),
    ...((d && d.core && d.core.pending) || []).map((x) => label(x, "Core: ")),
  ];
  let seen = [];
  if (fm.fileExists(seenPath)) {
    try { seen = JSON.parse(fm.readString(seenPath)); } catch (e) { seen = []; }
  }
  const fresh = pending.filter((m) => m.id && !seen.includes(m.id));
  for (const m of fresh) {
    const n = new Notification();
    n.title = `${m._src}Planned ${m.action}: ${m.ticker}`;
    n.body = `${money(m.dollars)} at ${m.when}. ${m.reason || ""}`.trim();
    n.threadIdentifier = "paper1k";
    n.openURL = URLScheme.forRunningScript();
    await n.schedule();
    seen.push(m.id);
  }
  if (fresh.length) fm.writeString(seenPath, JSON.stringify(seen.slice(-200)));
}

// ---------- formatting ----------
function money(v) {
  if (v === null || v === undefined || isNaN(v)) return "--";
  return "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(v, digits = 2) {
  if (v === null || v === undefined || isNaN(v)) return "--";
  const s = Number(v).toFixed(digits);
  return (v > 0 ? "+" : "") + s + "%";
}
function tone(v) {
  if (v === null || v === undefined || isNaN(v) || Math.abs(v) < 0.005) return C.dim;
  return v > 0 ? C.green : C.red;
}
function ago(iso) {
  const t = new Date(iso);
  if (isNaN(t)) return "";
  const m = Math.round((Date.now() - t.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  if (m < 1440) return Math.round(m / 60) + "h ago";
  return Math.round(m / 1440) + "d ago";
}
function statusLabel(d) {
  if (d.status === "PENDING_FILLS") return "ORDERS QUEUED";
  if (d.status === "FINAL") return "TEST COMPLETE";
  return "LIVE TEST";
}

// ---------- drawing ----------
function sparkline(history, w, h) {
  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const pts = (history || []).filter((p) => p.value != null && p.spy != null);
  // baseline at start capital
  if (pts.length < 2) {
    ctx.setStrokeColor(C.line);
    ctx.setLineWidth(1.5);
    const p = new Path();
    p.move(new Point(0, h / 2));
    p.addLine(new Point(w, h / 2));
    ctx.addPath(p);
    ctx.strokePath();
    ctx.setTextColor(C.dim);
    ctx.setFont(Font.mediumSystemFont(10));
    ctx.setTextAlignedCenter();
    ctx.drawTextInRect("chart starts after first close", new Rect(0, h / 2 + 4, w, 14));
    return ctx.getImage();
  }
  const all = pts.flatMap((p) => [p.value, p.spy]).concat([1000]);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 4) { hi += 2; lo -= 2; }
  const pad = 4;
  const x = (i) => pad + (i / (pts.length - 1)) * (w - pad * 2);
  const y = (v) => pad + (1 - (v - lo) / (hi - lo)) * (h - pad * 2);

  // start-capital guide
  ctx.setStrokeColor(C.line);
  ctx.setLineWidth(1);
  const g = new Path();
  g.move(new Point(pad, y(1000)));
  g.addLine(new Point(w - pad, y(1000)));
  ctx.addPath(g);
  ctx.strokePath();

  const draw = (key, color, width) => {
    const p = new Path();
    pts.forEach((pt, i) => {
      const P = new Point(x(i), y(pt[key]));
      if (i === 0) p.move(P); else p.addLine(P);
    });
    ctx.addPath(p);
    ctx.setStrokeColor(color);
    ctx.setLineWidth(width);
    ctx.strokePath();
  };
  draw("spy", C.spy, 1.5);
  const last = pts[pts.length - 1];
  const lineColor = last.value >= last.spy ? C.green : C.red;
  draw("value", lineColor, 2.5);
  ctx.setFillColor(lineColor);
  ctx.fillEllipse(new Rect(x(pts.length - 1) - 3, y(last.value) - 3, 6, 6));
  return ctx.getImage();
}

function stopMeter(h, w, ht) {
  // fill shows how much cushion is left between last price and stop (entry -8%)
  const ctx = new DrawContext();
  ctx.size = new Size(w, ht);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const room = h.last && h.stop ? (h.last - h.stop) / (h.entry - h.stop) : 1; // 1 = at entry
  const frac = Math.max(0, Math.min(1, room / 1.5));
  const col = room < 0.25 ? C.red : room < 0.6 ? C.amber : C.green;
  const bg = new Path();
  bg.addRoundedRect(new Rect(0, 0, w, ht), ht / 2, ht / 2);
  ctx.addPath(bg);
  ctx.setFillColor(C.line);
  ctx.fillPath();
  const fg = new Path();
  fg.addRoundedRect(new Rect(0, 0, Math.max(ht, w * frac), ht), ht / 2, ht / 2);
  ctx.addPath(fg);
  ctx.setFillColor(col);
  ctx.fillPath();
  return ctx.getImage();
}

function addText(stack, str, size, color, weight = "semibold") {
  const t = stack.addText(str);
  t.font =
    weight === "bold" ? Font.boldRoundedSystemFont(size)
    : weight === "mono" ? Font.boldMonospacedSystemFont(size)
    : weight === "regular" ? Font.regularSystemFont(size)
    : Font.semiboldRoundedSystemFont(size);
  t.textColor = color;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.6;
  return t;
}

function chip(stack, str, color) {
  const c = stack.addStack();
  c.backgroundColor = new Color(color.hex, 0.18);
  c.cornerRadius = 6;
  c.setPadding(2, 6, 2, 6);
  addText(c, str, 10, color, "bold");
  return c;
}

function pendingBanner(stack, d, compact) {
  const p = d.pending || [];
  if (!p.length) return;
  const b = stack.addStack();
  b.layoutHorizontally();
  b.centerAlignContent();
  b.backgroundColor = new Color(C.amber.hex, 0.16);
  b.cornerRadius = 8;
  b.setPadding(4, 8, 4, 8);
  const sym = SFSymbol.named("bell.badge.fill");
  const img = b.addImage(sym.image);
  img.imageSize = new Size(11, 11);
  img.tintColor = C.amber;
  b.addSpacer(5);
  const first = p[0];
  const more = p.length > 1 ? `  +${p.length - 1} more` : "";
  const label = compact
    ? `${first.action} ${first.ticker}${more}`
    : `Planned: ${p.map((m) => `${m.action} ${m.ticker}`).join(", ")} · ${first.when}`;
  addText(b, label, 10, C.amber, "bold");
}

function header(w, d) {
  const top = w.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  addText(top, (d.name || "Paper $1K").toUpperCase(), 11, C.dim, "bold");
  top.addSpacer(6);
  const dot = top.addStack();
  dot.size = new Size(6, 6);
  dot.cornerRadius = 3;
  dot.backgroundColor = d.status === "ACTIVE" ? C.green : d.status === "FINAL" ? C.spy : C.amber;
  top.addSpacer();
  addText(top, d._offline ? "offline" : ago(d.updated), 10, C.dim, "regular");
}

function vsSpyRow(stack, d, size) {
  const r = stack.addStack();
  r.layoutHorizontally();
  r.centerAlignContent();
  chip(r, pct(d.total_pct), tone(d.total_pct));
  r.addSpacer(5);
  const edge = (d.total_pct ?? 0) - (d.spy_total_pct ?? 0);
  addText(r, `vs SPY ${pct(edge)}`, size, tone(edge), "bold");
}

function holdingTile(row, h, width, total) {
  if (h.stop == null) return weightTile(row, h, width, total);
  const t = row.addStack();
  t.layoutVertically();
  t.backgroundColor = C.card;
  t.cornerRadius = 10;
  t.setPadding(6, 8, 6, 8);
  t.size = new Size(width, 0);
  const top = t.addStack();
  addText(top, h.ticker, 12, C.text, "mono");
  top.addSpacer();
  const ch = h.entry && h.last ? (h.last / h.entry - 1) * 100 : null;
  addText(top, pct(ch, 1), 11, tone(ch), "bold");
  t.addSpacer(4);
  const m = t.addImage(stopMeter(h, width - 16, 4));
  m.imageSize = new Size(width - 16, 4);
  t.addSpacer(3);
  const toStop = h.last && h.stop ? (h.last / h.stop - 1) * 100 : null;
  addText(t, `stop ${toStop === null ? "--" : toStop.toFixed(1) + "% away"}`, 9, C.dim, "regular");
}

// Buy-and-hold holdings have no stop: show the position's share of the portfolio instead.
function weightTile(row, h, width, total) {
  const t = row.addStack();
  t.layoutVertically();
  t.backgroundColor = C.card;
  t.cornerRadius = 10;
  t.setPadding(6, 8, 6, 8);
  t.size = new Size(width, 0);
  const top = t.addStack();
  addText(top, h.ticker, 12, C.text, "mono");
  top.addSpacer();
  const ch = h.entry && h.last ? (h.last / h.entry - 1) * 100 : null;
  addText(top, pct(ch, 1), 11, tone(ch), "bold");
  t.addSpacer(4);
  const val = h.last && h.shares ? h.last * h.shares : null;
  const wt = val && total ? val / total : null;
  const ctx = new DrawContext();
  ctx.size = new Size(width - 16, 4);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const bg = new Path();
  bg.addRoundedRect(new Rect(0, 0, width - 16, 4), 2, 2);
  ctx.addPath(bg);
  ctx.setFillColor(C.line);
  ctx.fillPath();
  const fg = new Path();
  fg.addRoundedRect(new Rect(0, 0, Math.max(4, (width - 16) * (wt || 0)), 4), 2, 2);
  ctx.addPath(fg);
  ctx.setFillColor(C.spy);
  ctx.fillPath();
  const m = t.addImage(ctx.getImage());
  m.imageSize = new Size(width - 16, 4);
  t.addSpacer(3);
  addText(t, wt == null ? "weight --" : `${(wt * 100).toFixed(1)}% of port`, 9, C.dim, "regular");
}

// one-line summary of the other portfolio, shown under the momentum widget
function coreLine(stack, core, size) {
  if (!core) return;
  const r = stack.addStack();
  r.layoutHorizontally();
  r.centerAlignContent();
  addText(r, "CORE", size, C.dim, "bold");
  r.addSpacer(5);
  if (core.status === "PENDING_FILLS") {
    addText(r, "buys at next close", size, C.amber, "regular");
    return;
  }
  addText(r, money(core.value), size, C.text, "bold");
  r.addSpacer(5);
  addText(r, pct(core.total_pct), size, tone(core.total_pct), "bold");
  r.addSpacer(5);
  const e = (core.total_pct ?? 0) - (core.spy_total_pct ?? 0);
  addText(r, `vs SPY ${pct(e)}`, size, C.dim, "regular");
}

// ---------- layouts ----------
function base() {
  const w = new ListWidget();
  const g = new LinearGradient();
  g.colors = [C.bgTop, C.bgBot];
  g.locations = [0, 1];
  w.backgroundGradient = g;
  w.setPadding(12, 14, 12, 14);
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return w;
}

// ---------- small: stock-ticker card ----------
// Full-bleed area chart with a fading glow, big price with small cents,
// a change pill, SPY ghost line, and a scrolling-tape style holdings row.
const S = {
  bg0: new Color("#03060B"),
  bg1: new Color("#0A1120"),
  up: new Color("#00E28A"),
  down: new Color("#FF3D5A"),
  flat: new Color("#9AA4BC"),
  ink: new Color("#FFFFFF"),
  mute: new Color("#6F7A94"),
  spy: new Color("#8A95FF"),
  grid: new Color("#FFFFFF", 0.07),
};

function areaChart(history, w, h, color) {
  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  // faint price grid
  ctx.setStrokeColor(S.grid);
  ctx.setLineWidth(0.5);
  for (let i = 1; i <= 3; i++) {
    const gy = (h / 4) * i;
    const gl = new Path();
    gl.move(new Point(0, gy));
    gl.addLine(new Point(w, gy));
    ctx.addPath(gl);
    ctx.strokePath();
  }

  const pts = (history || []).filter((p) => p.value != null && p.spy != null);
  if (pts.length < 2) {
    // pre-market look: dashed flat line at $1,000 with a pulsing-style dot
    ctx.setStrokeColor(new Color(S.flat.hex, 0.6));
    ctx.setLineWidth(1.5);
    for (let x = 0; x < w - 12; x += 7) {
      const seg = new Path();
      seg.move(new Point(x, h * 0.55));
      seg.addLine(new Point(Math.min(x + 4, w - 12), h * 0.55));
      ctx.addPath(seg);
      ctx.strokePath();
    }
    ctx.setFillColor(new Color(S.flat.hex, 0.25));
    ctx.fillEllipse(new Rect(w - 16, h * 0.55 - 6, 12, 12));
    ctx.setFillColor(S.flat);
    ctx.fillEllipse(new Rect(w - 13, h * 0.55 - 3, 6, 6));
    return ctx.getImage();
  }

  const all = pts.flatMap((p) => [p.value, p.spy]).concat([1000]);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 4) { hi += 2; lo -= 2; }
  const top = 6, bottom = h - 2, right = w - 8;
  const X = (i) => (i / (pts.length - 1)) * right;
  const Y = (v) => top + (1 - (v - lo) / (hi - lo)) * (bottom - top);
  const line = pts.map((p, i) => new Point(X(i), Y(p.value)));

  // fading glow: stacked bands under the line, densest at the line
  const bands = 9;
  for (let b = bands; b >= 1; b--) {
    const depth = (b / bands) * (h - top);
    const area = new Path();
    area.move(line[0]);
    line.forEach((pt) => area.addLine(pt));
    for (let i = line.length - 1; i >= 0; i--) {
      area.addLine(new Point(line[i].x, Math.min(bottom, line[i].y + depth)));
    }
    area.closeSubpath();
    ctx.addPath(area);
    ctx.setFillColor(new Color(color.hex, 0.07));
    ctx.fillPath();
  }

  // $1,000 start line (dashed)
  ctx.setStrokeColor(new Color("#FFFFFF", 0.22));
  ctx.setLineWidth(0.8);
  for (let x = 0; x < right; x += 6) {
    const seg = new Path();
    seg.move(new Point(x, Y(1000)));
    seg.addLine(new Point(Math.min(x + 3, right), Y(1000)));
    ctx.addPath(seg);
    ctx.strokePath();
  }

  // SPY ghost line
  const spy = new Path();
  pts.forEach((p, i) => (i ? spy.addLine(new Point(X(i), Y(p.spy))) : spy.move(new Point(X(i), Y(p.spy)))));
  ctx.addPath(spy);
  ctx.setStrokeColor(new Color(S.spy.hex, 0.55));
  ctx.setLineWidth(1.2);
  ctx.strokePath();

  // portfolio line
  const pl = new Path();
  line.forEach((pt, i) => (i ? pl.addLine(pt) : pl.move(pt)));
  ctx.addPath(pl);
  ctx.setStrokeColor(color);
  ctx.setLineWidth(2.2);
  ctx.strokePath();

  // live dot with halo
  const L = line[line.length - 1];
  ctx.setFillColor(new Color(color.hex, 0.22));
  ctx.fillEllipse(new Rect(L.x - 7, L.y - 7, 14, 14));
  ctx.setFillColor(color);
  ctx.fillEllipse(new Rect(L.x - 3, L.y - 3, 6, 6));
  return ctx.getImage();
}

function tapeRow(w, d) {
  const tape = w.addStack();
  tape.layoutHorizontally();
  tape.centerAlignContent();
  tape.setPadding(5, 12, 10, 12);
  const pend = d.pending || [];
  if (pend.length) {
    const bell = tape.addImage(SFSymbol.named("bell.badge.fill").image);
    bell.imageSize = new Size(10, 10);
    bell.tintColor = C.amber;
    tape.addSpacer(4);
    const first = pend[0];
    const more = pend.length > 1 ? ` +${pend.length - 1}` : "";
    const t = tape.addText(`${first.action} ${first.ticker}${more} @ CLOSE`);
    t.font = Font.boldMonospacedSystemFont(9);
    t.textColor = C.amber;
    t.lineLimit = 1;
    t.minimumScaleFactor = 0.7;
    return;
  }
  const hs = (d.holdings || []).slice(0, 3);
  if (!hs.length) {
    const t = tape.addText("ALL CASH");
    t.font = Font.boldMonospacedSystemFont(9);
    t.textColor = S.mute;
    return;
  }
  hs.forEach((h, i) => {
    const ch = h.entry && h.last ? (h.last / h.entry - 1) * 100 : 0;
    const sym = tape.addText(h.ticker);
    sym.font = Font.boldMonospacedSystemFont(9);
    sym.textColor = S.ink;
    tape.addSpacer(2);
    const arrow = ch > 0.05 ? "▲" : ch < -0.05 ? "▼" : "•";
    const v = tape.addText(`${arrow}${Math.abs(ch).toFixed(1)}`);
    v.font = Font.mediumMonospacedSystemFont(9);
    v.textColor = ch > 0.05 ? S.up : ch < -0.05 ? S.down : S.flat;
    v.lineLimit = 1;
    v.minimumScaleFactor = 0.6;
    if (i < hs.length - 1) tape.addSpacer();
  });
}

function small(d) {
  const total = d.total_pct ?? 0;
  const edge = total - (d.spy_total_pct ?? 0);
  const col = Math.abs(total) < 0.005 ? S.flat : total > 0 ? S.up : S.down;

  const w = new ListWidget();
  const g = new LinearGradient();
  const tint = (d.pending || []).length ? C.amber : col;
  g.colors = [S.bg1, S.bg0, new Color(tint.hex, 0.12)];
  g.locations = [0, 0.55, 1];
  w.backgroundGradient = g;
  w.setPadding(0, 0, 0, 0);
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  // row 1: ticker + change pill
  const top = w.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  top.setPadding(12, 12, 0, 12);
  const tk = top.addText(d.tag || "P1K");
  tk.font = Font.heavyMonospacedSystemFont(14);
  tk.textColor = S.ink;
  top.addSpacer(4);
  const live = top.addStack();
  live.size = new Size(5, 5);
  live.cornerRadius = 2.5;
  live.backgroundColor = d._offline ? S.mute : d.status === "ACTIVE" ? S.up : C.amber;
  top.addSpacer();
  const pill = top.addStack();
  pill.backgroundColor = col;
  pill.cornerRadius = 5;
  pill.setPadding(2, 5, 2, 5);
  const arrow = Math.abs(total) < 0.005 ? "" : total > 0 ? "▲ " : "▼ ";
  const pt = pill.addText(arrow + Math.abs(total).toFixed(2) + "%");
  pt.font = Font.boldMonospacedSystemFont(10);
  pt.textColor = Math.abs(total) < 0.005 ? S.bg0 : new Color("#03060B");
  pt.lineLimit = 1;

  // row 2: big price with small cents
  const pr = w.addStack();
  pr.layoutHorizontally();
  pr.bottomAlignContent();
  pr.setPadding(2, 12, 0, 12);
  const val = Number(d.value ?? 0);
  const [whole, cents] = val.toFixed(2).split(".");
  const big = pr.addText("$" + Number(whole).toLocaleString("en-US"));
  big.font = Font.boldRoundedSystemFont(26);
  big.textColor = S.ink;
  big.minimumScaleFactor = 0.7;
  big.lineLimit = 1;
  const sm = pr.addText("." + cents);
  sm.font = Font.boldRoundedSystemFont(14);
  sm.textColor = S.mute;

  // row 3: vs SPY
  const sub = w.addStack();
  sub.layoutHorizontally();
  sub.setPadding(0, 12, 0, 12);
  const s1 = sub.addText("vs SPY ");
  s1.font = Font.mediumMonospacedSystemFont(9);
  s1.textColor = S.mute;
  const s2 = sub.addText((edge > 0 ? "+" : "") + edge.toFixed(2) + "%");
  s2.font = Font.boldMonospacedSystemFont(9);
  s2.textColor = Math.abs(edge) < 0.005 ? S.flat : edge > 0 ? S.up : S.down;
  sub.addSpacer();
  const s3 = sub.addText(d._offline ? "offline" : ago(d.updated));
  s3.font = Font.mediumMonospacedSystemFont(8);
  s3.textColor = S.mute;

  w.addSpacer();

  // full-bleed chart
  const chart = w.addImage(areaChart(d.history, 170, 50, col));
  chart.imageSize = new Size(170, 50);

  // ticker tape or planned-move alert
  tapeRow(w, d);
  return w;
}

function medium(d) {
  const w = base();
  header(w, d);
  w.addSpacer(6);
  const mid = w.addStack();
  mid.layoutHorizontally();
  const left = mid.addStack();
  left.layoutVertically();
  addText(left, money(d.value), 26, C.text, "bold");
  left.addSpacer(3);
  vsSpyRow(left, d, 11);
  left.addSpacer(3);
  if (d._core) coreLine(left, d._core, 10);
  else addText(left, `today ${pct(d.day_pct)} · SPY ${money(d.spy_value)}`, 10, C.dim, "regular");
  mid.addSpacer();
  const sp = mid.addImage(sparkline(d.history, 128, 56));
  sp.imageSize = new Size(128, 56);
  w.addSpacer();
  if ((d.pending || []).length) {
    pendingBanner(w, d, false);
  } else {
    const row = w.addStack();
    row.layoutHorizontally();
    const hs = (d.holdings || []).slice(0, 3);
    hs.forEach((h, i) => {
      holdingTile(row, h, 98, d.value);
      if (i < hs.length - 1) row.addSpacer(6);
    });
    if (!hs.length) addText(w, "All cash", 11, C.dim);
  }
  return w;
}

function large(d) {
  const w = base();
  header(w, d);
  w.addSpacer(8);
  addText(w, money(d.value), 32, C.text, "bold");
  w.addSpacer(3);
  vsSpyRow(w, d, 12);
  w.addSpacer(8);
  const sp = w.addImage(sparkline(d.history, 300, 84));
  sp.imageSize = new Size(300, 84);
  const legend = w.addStack();
  addText(legend, "● portfolio", 9, C.green, "regular");
  legend.addSpacer(8);
  addText(legend, "● SPY", 9, C.spy, "regular");
  legend.addSpacer();
  addText(legend, `SPY ${pct(d.spy_total_pct)}`, 9, C.dim, "regular");
  w.addSpacer(8);
  pendingBanner(w, d, false);
  if ((d.pending || []).length) w.addSpacer(6);
  const row = w.addStack();
  row.layoutHorizontally();
  const hs = (d.holdings || []).slice(0, 3);
  hs.forEach((h, i) => {
    holdingTile(row, h, 98, d.value);
    if (i < hs.length - 1) row.addSpacer(6);
  });
  w.addSpacer(8);
  addText(w, "LAST MOVES", 10, C.dim, "bold");
  w.addSpacer(3);
  const tr = (d.trades || []).slice(-3).reverse();
  if (!tr.length) addText(w, "No fills yet", 11, C.dim, "regular");
  tr.forEach((t) => {
    const r = w.addStack();
    addText(r, `${t.action} ${t.ticker}`, 11, t.action === "BUY" ? C.green : C.red, "mono");
    r.addSpacer();
    addText(r, `${money(t.dollars)} · ${t.date}`, 10, C.dim, "regular");
  });
  w.addSpacer();
  if (d._core) { coreLine(w, d._core, 10); w.addSpacer(3); }
  addText(w, d.next_event || "", 10, C.dim, "regular");
  return w;
}

// ---------- compare: Momentum vs Core vs SPY on one widget ----------
const CORE_COL = new Color("#4FC3F7");

// Shared closes of both portfolios, indexed to 100 at the first shared close.
function sharedSeries(data) {
  const core = data.core || {};
  const bmap = {};
  (core.history || []).forEach((x) => { if (x.value != null) bmap[x.date] = x; });
  const both = (data.history || []).filter((x) => x.value != null && x.spy != null && bmap[x.date]);
  if (!both.length) return null;
  const a0 = both[0].value, b0 = bmap[both[0].date].value, s0 = both[0].spy;
  return {
    from: both[0].date,
    to: both[both.length - 1].date,
    mom: both.map((x) => (x.value / a0) * 100),
    core: both.map((x) => (bmap[x.date].value / b0) * 100),
    spy: both.map((x) => (x.spy / s0) * 100),
  };
}

function compareChart(ser, w, h) {
  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const n = ser ? ser.mom.length : 0;
  if (n < 2) {
    ctx.setStrokeColor(C.line);
    ctx.setLineWidth(1.5);
    const p = new Path();
    p.move(new Point(0, h / 2));
    p.addLine(new Point(w, h / 2));
    ctx.addPath(p);
    ctx.strokePath();
    ctx.setTextColor(C.dim);
    ctx.setFont(Font.mediumSystemFont(10));
    ctx.setTextAlignedCenter();
    ctx.drawTextInRect("race starts after Core's first close", new Rect(0, h / 2 + 4, w, 14));
    return ctx.getImage();
  }
  const all = ser.mom.concat(ser.core, ser.spy, [100]);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 0.4) { hi += 0.2; lo -= 0.2; }
  const pad = 4;
  const X = (i) => pad + (i / (n - 1)) * (w - pad * 2);
  const Y = (v) => pad + (1 - (v - lo) / (hi - lo)) * (h - pad * 2);
  ctx.setStrokeColor(C.line);
  ctx.setLineWidth(1);
  const g = new Path();
  g.move(new Point(pad, Y(100)));
  g.addLine(new Point(w - pad, Y(100)));
  ctx.addPath(g);
  ctx.strokePath();
  const draw = (vals, color, width) => {
    const p = new Path();
    vals.forEach((v, i) => (i ? p.addLine(new Point(X(i), Y(v))) : p.move(new Point(X(i), Y(v)))));
    ctx.addPath(p);
    ctx.setStrokeColor(color);
    ctx.setLineWidth(width);
    ctx.strokePath();
    ctx.setFillColor(color);
    ctx.fillEllipse(new Rect(X(n - 1) - 2.5, Y(vals[n - 1]) - 2.5, 5, 5));
  };
  draw(ser.spy, C.spy, 1.3);
  draw(ser.core, CORE_COL, 2.2);
  draw(ser.mom, C.green, 2.2);
  return ctx.getImage();
}

function racerRow(stack, label, color, d, size) {
  const r = stack.addStack();
  r.layoutVertically();
  const top = r.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  const dot = top.addStack();
  dot.size = new Size(7, 7);
  dot.cornerRadius = 3.5;
  dot.backgroundColor = color;
  top.addSpacer(5);
  addText(top, label, size - 2, C.dim, "bold");
  r.addSpacer(1);
  const mid = r.addStack();
  mid.layoutHorizontally();
  mid.bottomAlignContent();
  if (!d || d.status === "PENDING_FILLS") {
    addText(mid, money(d ? d.value : null), size + 4, C.text, "bold");
    mid.addSpacer(5);
    addText(mid, "buys at next close", size - 2, C.amber, "bold");
    return;
  }
  addText(mid, money(d.value), size + 4, C.text, "bold");
  mid.addSpacer(5);
  addText(mid, pct(d.total_pct), size - 1, tone(d.total_pct), "bold");
  const e = (d.total_pct ?? 0) - (d.spy_total_pct ?? 0);
  addText(r, `vs SPY ${pct(e)} · today ${pct(d.day_pct)}`, size - 3, C.dim, "regular");
}

function verdictLine(data, ser) {
  const core = data.core;
  if (core && core.status === "PENDING_FILLS") return { text: "Core buys VTI, VXUS, BND at Thu 10/29 close", color: C.amber };
  if (!ser || ser.mom.length < 2) return { text: `Head to head starts from the ${ser ? ser.from : "first shared"} close`, color: C.dim };
  const n = ser.mom.length - 1;
  const m = ser.mom[n] - 100, c = ser.core[n] - 100, s = ser.spy[n] - 100;
  const gap = Math.abs(m - c);
  const lead = gap < 0.005 ? "Dead even" : m > c ? `Momentum ahead by ${gap.toFixed(2)} pts` : `Core ahead by ${gap.toFixed(2)} pts`;
  return { text: `${lead} since ${ser.from} (SPY ${pct(s)})`, color: gap < 0.005 ? C.dim : m > c ? C.green : CORE_COL };
}

function compareHeader(w, data) {
  const top = w.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  addText(top, "MOMENTUM VS CORE", 11, C.dim, "bold");
  top.addSpacer();
  addText(top, data._offline ? "offline" : ago(data.updated), 10, C.dim, "regular");
}

function compareMedium(data) {
  const w = base();
  const ser = sharedSeries(data);
  compareHeader(w, data);
  w.addSpacer(6);
  const mid = w.addStack();
  mid.layoutHorizontally();
  const left = mid.addStack();
  left.layoutVertically();
  racerRow(left, "MOMENTUM", C.green, data, 12);
  left.addSpacer(6);
  racerRow(left, "CORE", CORE_COL, data.core, 12);
  mid.addSpacer();
  const ch = mid.addImage(compareChart(ser, 120, 78));
  ch.imageSize = new Size(120, 78);
  w.addSpacer();
  const v = verdictLine(data, ser);
  addText(w, v.text, 10, v.color, "bold");
  return w;
}

function compareLarge(data) {
  const w = base();
  const ser = sharedSeries(data);
  compareHeader(w, data);
  w.addSpacer(8);
  const row = w.addStack();
  row.layoutHorizontally();
  const a = row.addStack();
  a.layoutVertically();
  racerRow(a, "MOMENTUM", C.green, data, 13);
  row.addSpacer();
  const b = row.addStack();
  b.layoutVertically();
  racerRow(b, "CORE", CORE_COL, data.core, 13);
  w.addSpacer(8);
  const ch = w.addImage(compareChart(ser, 300, 92));
  ch.imageSize = new Size(300, 92);
  const legend = w.addStack();
  addText(legend, "● Momentum", 9, C.green, "regular");
  legend.addSpacer(8);
  addText(legend, "● Core", 9, CORE_COL, "regular");
  legend.addSpacer(8);
  addText(legend, "● SPY", 9, C.spy, "regular");
  legend.addSpacer();
  addText(legend, "indexed to 100", 9, C.dim, "regular");
  w.addSpacer(6);
  const v = verdictLine(data, ser);
  addText(w, v.text, 10, v.color, "bold");
  w.addSpacer(8);
  // holdings, one column per portfolio
  const cols = w.addStack();
  cols.layoutHorizontally();
  const list = (stack, title, hs, pend) => {
    const c = stack.addStack();
    c.layoutVertically();
    c.backgroundColor = C.card;
    c.cornerRadius = 10;
    c.setPadding(6, 8, 6, 8);
    c.size = new Size(148, 0);
    addText(c, title, 9, C.dim, "bold");
    c.addSpacer(3);
    if (!hs.length) {
      addText(c, pend.length ? pend.map((p) => p.ticker).join(", ") + " at close" : "All cash", 10, pend.length ? C.amber : C.dim, "regular");
      return;
    }
    hs.slice(0, 3).forEach((h) => {
      const r = c.addStack();
      r.layoutHorizontally();
      addText(r, h.ticker, 11, C.text, "mono");
      r.addSpacer();
      const chg = h.entry && h.last ? (h.last / h.entry - 1) * 100 : null;
      addText(r, pct(chg, 1), 10, tone(chg), "bold");
    });
  };
  list(cols, "MOMENTUM HOLDINGS", data.holdings || [], data.pending || []);
  cols.addSpacer();
  list(cols, "CORE HOLDINGS", (data.core && data.core.holdings) || [], (data.core && data.core.pending) || []);
  w.addSpacer();
  addText(w, data.next_event || "", 9, C.dim, "regular");
  return w;
}

function errorWidget() {
  const w = base();
  addText(w, "PAPER $1K", 11, C.dim, "bold");
  w.addSpacer();
  addText(w, "Couldn't load data. Check connection.", 12, C.text);
  return w;
}

// ---------- in-app dashboard ----------
function dashboardHTML(data, start) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#0B1220;--card:rgba(255,255,255,.06);--t:#F4F6FB;--d:#8C97B2;--g:#2BD67B;--r:#FF5C6C;--a:#FFB547;--s:#7C8BFF;--c:#4FC3F7}
*{box-sizing:border-box}html{background:#0B1220}body{margin:0;min-height:100vh;background:linear-gradient(#0B1220,#121C33);color:var(--t);font:15px -apple-system,system-ui;padding:16px 16px 40px}
h1{font-size:13px;letter-spacing:.08em;color:var(--d);margin:0 0 4px}.big{font-size:38px;font-weight:800}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.chip{padding:3px 8px;border-radius:8px;font-weight:700;font-size:13px}
.card{background:var(--card);border-radius:14px;padding:12px;margin-top:12px}.dim{color:var(--d);font-size:13px}
.seg{display:flex;gap:4px;background:var(--card);border-radius:12px;padding:4px;margin-bottom:14px}.sg{flex:1;text-align:center;padding:7px 0;border-radius:9px;color:var(--d);font-weight:700;font-size:13px}
.sg.on{background:rgba(255,255,255,.14);color:var(--t)}
.tabs{display:flex;gap:6px;margin-top:14px}.tab{flex:1;text-align:center;padding:8px 0;border-radius:10px;background:var(--card);color:var(--d);font-weight:600;font-size:13px}
.tab.on{background:#fff;color:#0B1220}.h{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08)}
.h:last-child{border:0}.mono{font-family:ui-monospace,Menlo,monospace;font-weight:700}.bar{height:6px;border-radius:3px;background:rgba(255,255,255,.12);margin-top:6px;overflow:hidden}
.bar>i{display:block;height:100%}.pend{background:rgba(255,181,71,.15);color:var(--a);border-radius:12px;padding:10px 12px;margin-top:12px;font-weight:600}
svg{width:100%;height:170px;display:block}.tip{font-size:12px;color:var(--d);text-align:right;min-height:16px}
.leg{display:flex;gap:12px;font-size:12px;color:var(--d);margin-top:6px}.leg b{font-weight:700}
</style></head><body>
<div class="seg" id="seg"><div class="sg" data-v="momentum">Momentum</div><div class="sg" data-v="core">Core</div><div class="sg" data-v="compare">Compare</div></div>
<div id="app"></div>
<script>
const D=${json};
const $=s=>document.querySelector(s);
const m=v=>v==null||isNaN(v)?'--':'$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const p=(v,k=2)=>v==null||isNaN(v)?'--':(v>0?'+':'')+Number(v).toFixed(k)+'%';
const c=v=>v==null||Math.abs(v)<.005?'var(--d)':v>0?'var(--g)':'var(--r)';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const views={momentum:D,core:D.core};
function chart(svg,series,base,tipEl,fmt){
  const n=series[0].pts.length;
  if(n<2){svg.innerHTML='<line x1="0" y1="85" x2="340" y2="85" stroke="rgba(255,255,255,.15)"/><text x="170" y="105" fill="#8C97B2" font-size="12" text-anchor="middle">Chart starts after the first close</text>';return;}
  const vals=series.flatMap(s=>s.pts).concat([base]);let lo=Math.min(...vals),hi=Math.max(...vals);const pad=(hi-lo)<base*.004?base*.002:0;hi+=pad;lo-=pad;
  const X=i=>6+i/(n-1)*328,Y=v=>8+(1-(v-lo)/(hi-lo))*154;
  svg.innerHTML='<line x1="0" x2="340" y1="'+Y(base)+'" y2="'+Y(base)+'" stroke="rgba(255,255,255,.12)" stroke-dasharray="3 4"/>'+
    series.map(s=>'<path d="'+s.pts.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ')+'" fill="none" stroke="'+s.col+'" stroke-width="'+s.w+'"/>').join('')+
    '<line class="cur" y1="0" y2="170" stroke="rgba(255,255,255,.35)" visibility="hidden"/>';
  const move=e=>{const r=svg.getBoundingClientRect(),t=(e.touches?e.touches[0]:e),fx=(t.clientX-r.left)/r.width;
    const i=Math.max(0,Math.min(n-1,Math.round(fx*(n-1)))),cur=svg.querySelector('.cur');cur.setAttribute('x1',X(i));cur.setAttribute('x2',X(i));cur.setAttribute('visibility','visible');
    tipEl.innerHTML=esc(series[0].dates[i])+' · '+series.map(s=>'<b style="color:'+s.col+'">'+s.name+' '+fmt(s.pts[i])+'</b>').join(' · ');};
  svg.addEventListener('touchstart',move,{passive:true});svg.addEventListener('touchmove',move,{passive:true});svg.addEventListener('mousemove',move);
}
function renderOne(d,kind){
  const app=$('#app');
  if(!d){app.innerHTML='<div class="card dim">Core portfolio not set up yet.</div>';return;}
  const edge=(d.total_pct||0)-(d.spy_total_pct||0);
  app.innerHTML='<h1>'+esc((d.name||'').toUpperCase())+' · '+esc(d.test_window||'')+'</h1>'+
    (d.strategy?'<div class="dim" style="margin-bottom:4px">'+esc(d.strategy)+'</div>':'')+
    '<div class="big">'+m(d.value)+'</div>'+
    '<div class="row"><span class="chip" style="background:rgba(255,255,255,.08);color:'+c(d.total_pct)+'">'+p(d.total_pct)+'</span><span style="color:'+c(edge)+';font-weight:700">vs SPY '+p(edge)+'</span><span class="dim">today '+p(d.day_pct)+'</span></div>'+
    (d.pending||[]).map(x=>'<div class="pend">🔔 Planned '+esc(x.action)+' '+esc(x.ticker)+' · '+m(x.dollars)+' at '+esc(x.when)+'<div class="dim" style="color:#e9c58a;margin-top:2px">'+esc(x.reason)+'</div></div>').join('')+
    '<div class="card"><svg id="ch" viewBox="0 0 340 170" preserveAspectRatio="none"></svg><div class="tip" id="tip">Touch the chart to read a day</div></div>'+
    '<div class="tabs"><div class="tab on" data-t="hold">Holdings</div><div class="tab" data-t="sig">'+(kind==='core'?'Plan':'Signals')+'</div><div class="tab" data-t="log">Trades</div></div>'+
    '<div class="card" id="panel"></div><p class="dim">'+esc(d.next_event)+' '+esc(d.note)+'</p>';
  const H=(d.history||[]).filter(x=>x.value!=null&&x.spy!=null),last=H[H.length-1];
  const col=!last||last.value>=last.spy?'#2BD67B':'#FF5C6C';
  chart($('#ch'),[{name:'SPY',col:'#7C8BFF',w:1.6,pts:H.map(x=>x.spy),dates:H.map(x=>x.date)},{name:kind==='core'?'Core':'Port',col:col,w:2.6,pts:H.map(x=>x.value),dates:H.map(x=>x.date)}].reverse(),1000,$('#tip'),m);
  const panels={
    hold:()=>{const hs=d.holdings||[];if(!hs.length)return'<div class="dim">No positions yet. '+((d.pending||[]).length?'Orders are queued for the close.':'All cash.')+'</div>';
      return hs.map(h=>{const ch=h.entry&&h.last?(h.last/h.entry-1)*100:null,val=h.last&&h.shares?h.last*h.shares:null;let bar,sub;
        if(h.stop!=null){const room=h.last&&h.stop?(h.last-h.stop)/(h.entry-h.stop):1,f=Math.max(0,Math.min(1,room/1.5))*100,bc=room<.25?'var(--r)':room<.6?'var(--a)':'var(--g)';bar='<div class="bar"><i style="width:'+f+'%;background:'+bc+'"></i></div>';sub='entry '+m(h.entry)+' · last '+m(h.last)+' · stop '+m(h.stop);}
        else{const wt=val&&d.value?val/d.value*100:0;bar='<div class="bar"><i style="width:'+wt+'%;background:var(--s)"></i></div>';sub='entry '+m(h.entry)+' · last '+m(h.last)+' · '+wt.toFixed(1)+'% of port'+(h.target!=null?' (target '+h.target+'%)':'');}
        return '<div class="h"><div style="flex:1"><span class="mono">'+esc(h.ticker)+'</span> <span class="dim">'+(h.shares!=null?Number(h.shares).toFixed(4)+' sh':'')+'</span><div class="dim">'+sub+'</div>'+bar+'</div><div style="text-align:right;margin-left:10px"><div style="font-weight:700;color:'+c(ch)+'">'+p(ch,1)+'</div><div class="dim">'+m(val)+'</div></div></div>'}).join('')+'<div class="dim" style="margin-top:6px">Cash '+m(d.cash)+'</div>';},
    sig:()=>kind==='core'
      ?'<div class="dim" style="margin-bottom:6px">Bought once at the start, then held. No rebalancing, no stops.</div>'+(d.targets||[]).map(t=>'<div class="h"><span class="mono">'+esc(t.ticker)+'</span><span class="dim">'+esc(t.label||'')+'</span><span style="font-weight:700">'+t.weight+'%</span></div>').join('')
      :'<div class="dim" style="margin-bottom:6px">3-month momentum. Eligible = above 50-day avg. Top 3 eligible are held.</div>'+(d.signals||[]).map((s,i)=>'<div class="h"><span class="mono">'+(i+1)+'. '+esc(s.ticker)+'</span><span style="color:'+c(s.mom3m)+';font-weight:700">'+p(s.mom3m,1)+'</span><span class="dim">'+(s.vs50==null?'':p(s.vs50,1)+' vs 50d')+'</span><span>'+(s.eligible?'✅':'⛔️')+'</span></div>').join(''),
    log:()=>{const t=(d.trades||[]).slice().reverse();return t.length?t.map(x=>'<div class="h"><div><span class="mono" style="color:'+(x.action==='BUY'?'var(--g)':'var(--r)')+'">'+esc(x.action)+' '+esc(x.ticker)+'</span><div class="dim">'+esc(x.reason)+'</div></div><div style="text-align:right"><div>'+m(x.dollars)+'</div><div class="dim">'+esc(x.date)+(x.price?' @ '+m(x.price):'')+'</div></div></div>').join(''):'<div class="dim">No fills yet.</div>';}};
  const show=k=>{document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.t===k));$('#panel').innerHTML=panels[k]();};
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>show(t.dataset.t));show('hold');
}
function renderCompare(){
  const A=D,B=D.core,app=$('#app');
  const row=(nm,d,col)=>d?'<div class="h"><div><b style="color:'+col+'">'+nm+'</b><div class="dim">'+esc(d.strategy||'')+'</div></div><div style="text-align:right"><div style="font-weight:700">'+m(d.value)+'</div><div style="color:'+c(d.total_pct)+';font-weight:700">'+p(d.total_pct)+'</div><div class="dim">vs SPY '+p((d.total_pct||0)-(d.spy_total_pct||0))+'</div></div></div>':'';
  // common window: dates present in both histories, rebased to 100 at the first shared close
  const ha=(A.history||[]),hb=(B&&B.history)||[],bmap={};hb.forEach(x=>bmap[x.date]=x);
  const both=ha.filter(x=>bmap[x.date]&&x.value!=null&&bmap[x.date].value!=null);
  let tbl='';
  if(both.length){const a0=both[0].value,b0=bmap[both[0].date].value,s0=both[0].spy,L=both[both.length-1];
    const ra=(L.value/a0-1)*100,rb=(bmap[L.date].value/b0-1)*100,rs=(L.spy/s0-1)*100;
    tbl='<div class="card"><div class="dim" style="margin-bottom:6px">Same window: '+esc(both[0].date)+' close to '+esc(L.date)+'</div>'+
      '<div class="h"><span style="color:var(--g);font-weight:700">Momentum</span><span style="color:'+c(ra)+';font-weight:700">'+p(ra)+'</span></div>'+
      '<div class="h"><span style="color:var(--c);font-weight:700">Core</span><span style="color:'+c(rb)+';font-weight:700">'+p(rb)+'</span></div>'+
      '<div class="h"><span style="color:var(--s);font-weight:700">SPY</span><span style="color:'+c(rs)+';font-weight:700">'+p(rs)+'</span></div></div>';}
  app.innerHTML='<h1>MOMENTUM VS CORE VS SPY</h1><div class="card">'+row('Momentum',A,'var(--g)')+row('Core',B,'var(--c)')+'</div>'+tbl+
    '<div class="card"><svg id="ch" viewBox="0 0 340 170" preserveAspectRatio="none"></svg><div class="leg"><span><b style="color:#2BD67B">●</b> Momentum</span><span><b style="color:#4FC3F7">●</b> Core</span><span><b style="color:#7C8BFF">●</b> SPY</span></div><div class="tip" id="tip">Indexed to 100 at the first shared close</div></div>'+
    '<p class="dim">Each portfolio is also measured against its own SPY buy on its start date. Price returns only, no dividends, no costs.</p>';
  if(both.length){const a0=both[0].value,b0=bmap[both[0].date].value,s0=both[0].spy,ix=(v,b)=>v/b*100,dates=both.map(x=>x.date);
    chart($('#ch'),[{name:'Mom',col:'#2BD67B',w:2.4,pts:both.map(x=>ix(x.value,a0)),dates},{name:'Core',col:'#4FC3F7',w:2.4,pts:both.map(x=>ix(bmap[x.date].value,b0)),dates},{name:'SPY',col:'#7C8BFF',w:1.5,pts:both.map(x=>ix(x.spy,s0)),dates}],100,$('#tip'),v=>v.toFixed(2));}
  else chart($('#ch'),[{pts:[]}],100,$('#tip'),String);
}
function go(v){document.querySelectorAll('.sg').forEach(s=>s.classList.toggle('on',s.dataset.v===v));if(v==='compare')renderCompare();else renderOne(views[v],v);window.scrollTo(0,0);}
document.querySelectorAll('.sg').forEach(s=>s.onclick=()=>go(s.dataset.v));
go(${JSON.stringify(start)});
</script></body></html>`;
}

// ---------- Lock Screen (iOS renders these monochrome; tint comes from the wallpaper) ----------
const LW = new Color("#FFFFFF");
const LW2 = new Color("#FFFFFF", 0.6);
const LW3 = new Color("#FFFFFF", 0.35);

function lockSpark(history, w, h) {
  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const pts = (history || []).filter((p) => p.value != null && p.spy != null);
  const dashed = (y, col) => {
    ctx.setStrokeColor(col);
    ctx.setLineWidth(1);
    for (let x = 0; x < w; x += 5) {
      const s = new Path();
      s.move(new Point(x, y));
      s.addLine(new Point(Math.min(x + 2.5, w), y));
      ctx.addPath(s);
      ctx.strokePath();
    }
  };
  if (pts.length < 2) {
    // waiting for first close: ticker-style flat line with a dot at the end
    dashed(h / 2, LW3);
    ctx.setFillColor(LW);
    ctx.fillEllipse(new Rect(w - 6, h / 2 - 3, 6, 6));
    return ctx.getImage();
  }
  const all = pts.flatMap((p) => [p.value, p.spy]).concat([1000]);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 4) { hi += 2; lo -= 2; }
  const X = (i) => (i / (pts.length - 1)) * (w - 5);
  const Y = (v) => 3 + (1 - (v - lo) / (hi - lo)) * (h - 6);
  dashed(Y(1000), LW3);
  // filled area under portfolio line (light), then SPY thin, then portfolio bold
  const area = new Path();
  area.move(new Point(0, h));
  pts.forEach((p, i) => area.addLine(new Point(X(i), Y(p.value))));
  area.addLine(new Point(X(pts.length - 1), h));
  area.closeSubpath();
  ctx.addPath(area);
  ctx.setFillColor(new Color("#FFFFFF", 0.18));
  ctx.fillPath();
  const spy = new Path();
  pts.forEach((p, i) => (i ? spy.addLine(new Point(X(i), Y(p.spy))) : spy.move(new Point(X(i), Y(p.spy)))));
  ctx.addPath(spy);
  ctx.setStrokeColor(LW2);
  ctx.setLineWidth(1);
  ctx.strokePath();
  const pl = new Path();
  pts.forEach((p, i) => (i ? pl.addLine(new Point(X(i), Y(p.value))) : pl.move(new Point(X(i), Y(p.value)))));
  ctx.addPath(pl);
  ctx.setStrokeColor(LW);
  ctx.setLineWidth(2);
  ctx.strokePath();
  const last = pts[pts.length - 1];
  ctx.setFillColor(LW);
  ctx.fillEllipse(new Rect(X(pts.length - 1) - 3, Y(last.value) - 3, 6, 6));
  return ctx.getImage();
}

function arrowFor(v) {
  if (v == null || Math.abs(v) < 0.005) return "•";
  return v > 0 ? "▲" : "▼";
}

function lockRect(d) {
  const w = new ListWidget();
  w.addAccessoryWidgetBackground = false;
  w.setPadding(0, 0, 0, 0);
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  const total = d.total_pct ?? 0;
  const edge = total - (d.spy_total_pct ?? 0);

  // row 1: ticker + change
  const r1 = w.addStack();
  r1.layoutHorizontally();
  r1.centerAlignContent();
  const tk = r1.addText(d.tag || "P1K");
  tk.font = Font.heavyMonospacedSystemFont(12);
  tk.textColor = LW;
  r1.addSpacer(5);
  const ch = r1.addText(`${arrowFor(total)} ${Math.abs(total).toFixed(2)}%`);
  ch.font = Font.boldMonospacedSystemFont(12);
  ch.textColor = LW;
  r1.addSpacer();
  const vs = r1.addText(`vs SPY ${edge >= 0 ? "+" : ""}${edge.toFixed(1)}`);
  vs.font = Font.mediumMonospacedSystemFont(9);
  vs.minimumScaleFactor = 0.7;
  vs.textColor = LW2;
  vs.lineLimit = 1;

  // row 2: price
  const r2 = w.addStack();
  r2.layoutHorizontally();
  r2.bottomAlignContent();
  const [whole, cents] = Number(d.value ?? 0).toFixed(2).split(".");
  const big = r2.addText("$" + Number(whole).toLocaleString("en-US"));
  big.font = Font.boldRoundedSystemFont(20);
  big.textColor = LW;
  big.lineLimit = 1;
  big.minimumScaleFactor = 0.7;
  const c = r2.addText("." + cents);
  c.font = Font.boldRoundedSystemFont(12);
  c.textColor = LW2;

  w.addSpacer(2);
  // row 3: planned move alert, otherwise the chart
  if ((d.pending || []).length) {
    const p = d.pending[0];
    const more = d.pending.length > 1 ? ` +${d.pending.length - 1}` : "";
    const r3 = w.addStack();
    r3.layoutHorizontally();
    r3.centerAlignContent();
    const bell = r3.addImage(SFSymbol.named("bell.badge.fill").image);
    bell.imageSize = new Size(10, 10);
    bell.tintColor = LW;
    r3.addSpacer(4);
    const t = r3.addText(`${p.action} ${p.ticker}${more} @ CLOSE`);
    t.font = Font.boldMonospacedSystemFont(10);
    t.textColor = LW;
    t.lineLimit = 1;
    t.minimumScaleFactor = 0.7;
  } else {
    const img = w.addImage(lockSpark(d.history, 150, 18));
    img.imageSize = new Size(150, 18);
  }
  w.url = URLScheme.forRunningScript();
  return w;
}

function lockCircle(d) {
  // gauge: ring fills by total return (full ring = ±5%), arrow + % in the middle
  const total = d.total_pct ?? 0;
  const size = 64;
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const cx = size / 2, cy = size / 2, r = 27, lw = 5;
  const arc = (from, to, col) => {
    const steps = Math.max(2, Math.ceil(Math.abs(to - from) / 0.05));
    const p = new Path();
    for (let i = 0; i <= steps; i++) {
      const a = from + ((to - from) * i) / steps - Math.PI / 2;
      const pt = new Point(cx + r * Math.cos(a), cy + r * Math.sin(a));
      if (i === 0) p.move(pt); else p.addLine(pt);
    }
    ctx.addPath(p);
    ctx.setStrokeColor(col);
    ctx.setLineWidth(lw);
    ctx.strokePath();
  };
  arc(0, Math.PI * 2, new Color("#FFFFFF", 0.22));
  const frac = Math.max(-1, Math.min(1, total / 5));
  if (Math.abs(frac) > 0.005) arc(0, frac * Math.PI * 2, LW);
  // tick at 12 o'clock = $1,000 start
  ctx.setFillColor(LW);
  ctx.fillRect(new Rect(cx - 1, cy - r - lw / 2 - 1, 2, lw + 2));
  ctx.setTextAlignedCenter();
  ctx.setTextColor(LW);
  ctx.setFont(Font.boldMonospacedSystemFont(10));
  ctx.drawTextInRect(arrowFor(total), new Rect(0, cy - 17, size, 12));
  ctx.setFont(Font.boldRoundedSystemFont(13));
  ctx.drawTextInRect(`${Math.abs(total).toFixed(1)}%`, new Rect(0, cy - 6, size, 16));
  ctx.setFont(Font.mediumMonospacedSystemFont(8));
  ctx.setTextColor(LW2);
  ctx.drawTextInRect((d.pending || []).length ? "MOVE" : (d.tag || "P1K"), new Rect(0, cy + 9, size, 10));

  const w = new ListWidget();
  w.addAccessoryWidgetBackground = true;
  w.setPadding(0, 0, 0, 0);
  const img = w.addImage(ctx.getImage());
  img.imageSize = new Size(size, size);
  img.centerAlignImage();
  w.url = URLScheme.forRunningScript();
  return w;
}

function lockInline(d) {
  const total = d.total_pct ?? 0;
  const edge = total - (d.spy_total_pct ?? 0);
  const w = new ListWidget();
  const pend = d.pending || [];
  const txt = pend.length
    ? `🔔 ${pend[0].action} ${pend[0].ticker}${pend.length > 1 ? " +" + (pend.length - 1) : ""} at close`
    : `${arrowFor(total)} ${d.tag || "P1K"} ${money(d.value)} ${pct(total)} · SPY ${edge >= 0 ? "+" : ""}${edge.toFixed(1)}`;
  const t = w.addText(txt);
  t.font = Font.mediumSystemFont(12);
  w.url = URLScheme.forRunningScript();
  return w;
}

// ---------- main ----------
const data = await loadData();
if (data) await notifyNewMoves(data);

if (config.runsInWidget) {
  const fam = config.widgetFamily;
  const lockFamilies = { accessoryRectangular: lockRect, accessoryCircular: lockCircle, accessoryInline: lockInline };
  let w;
  if (!data) {
    w = new ListWidget();
    const t = w.addText(fam && fam.startsWith("accessory") ? "P1K offline" : "Couldn't load data");
    t.font = Font.mediumSystemFont(12);
  } else {
    const compare = VIEW === "" || VIEW === "compare";
    const v = viewOf(data, VIEW === "core" ? "core" : "momentum");
    if (lockFamilies[fam]) w = lockFamilies[fam](v);
    else if (fam === "small") w = small(v);
    else if (compare && data.core) w = fam === "large" ? compareLarge(data) : compareMedium(data);
    else w = fam === "large" ? large(v) : medium(v);
  }
  const single = fam === "small" || (fam && fam.startsWith("accessory"));
  const tab = VIEW === "core" ? "core" : VIEW === "momentum" || single ? "momentum" : "compare";
  w.url = URLScheme.forRunningScript() + "?view=" + tab;
  Script.setWidget(w);
} else if (data) {
  const wv = new WebView();
  await wv.loadHTML(dashboardHTML(data, VIEW === "core" ? "core" : VIEW === "momentum" ? "momentum" : "compare"));
  await wv.present(true);
} else {
  const a = new Alert();
  a.title = "Paper $1K";
  a.message = "Couldn't load portfolio data.";
  a.addAction("OK");
  await a.present();
}
Script.complete();
