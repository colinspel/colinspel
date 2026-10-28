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

async function notifyNewMoves(d) {
  const pending = (d && d.pending) || [];
  let seen = [];
  if (fm.fileExists(seenPath)) {
    try { seen = JSON.parse(fm.readString(seenPath)); } catch (e) { seen = []; }
  }
  const fresh = pending.filter((m) => m.id && !seen.includes(m.id));
  for (const m of fresh) {
    const n = new Notification();
    n.title = `Planned ${m.action}: ${m.ticker}`;
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

function holdingTile(row, h, width) {
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

function small(d) {
  const w = base();
  header(w, d);
  w.addSpacer(6);
  addText(w, money(d.value), 22, C.text, "bold");
  w.addSpacer(3);
  vsSpyRow(w, d, 10);
  w.addSpacer(6);
  const sp = w.addImage(sparkline(d.history, 130, 34));
  sp.imageSize = new Size(130, 34);
  w.addSpacer();
  if ((d.pending || []).length) pendingBanner(w, d, true);
  else addText(w, `${statusLabel(d)} · ${(d.holdings || []).map((h) => h.ticker).join(" ")}`, 9, C.dim, "regular");
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
  addText(left, `today ${pct(d.day_pct)} · SPY ${money(d.spy_value)}`, 10, C.dim, "regular");
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
      holdingTile(row, h, 98);
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
    holdingTile(row, h, 98);
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
  addText(w, d.next_event || "", 10, C.dim, "regular");
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
function dashboardHTML(d) {
  const json = JSON.stringify(d).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#0B1220;--card:rgba(255,255,255,.06);--t:#F4F6FB;--d:#8C97B2;--g:#2BD67B;--r:#FF5C6C;--a:#FFB547;--s:#7C8BFF}
*{box-sizing:border-box}html{background:#0B1220}body{margin:0;min-height:100vh;background:linear-gradient(#0B1220,#121C33);color:var(--t);font:15px -apple-system,system-ui;padding:16px 16px 40px}
h1{font-size:13px;letter-spacing:.08em;color:var(--d);margin:0 0 4px}.big{font-size:38px;font-weight:800}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.chip{padding:3px 8px;border-radius:8px;font-weight:700;font-size:13px}
.card{background:var(--card);border-radius:14px;padding:12px;margin-top:12px}.dim{color:var(--d);font-size:13px}
.tabs{display:flex;gap:6px;margin-top:14px}.tab{flex:1;text-align:center;padding:8px 0;border-radius:10px;background:var(--card);color:var(--d);font-weight:600;font-size:13px}
.tab.on{background:#fff;color:#0B1220}.h{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08)}
.h:last-child{border:0}.mono{font-family:ui-monospace,Menlo,monospace;font-weight:700}.bar{height:6px;border-radius:3px;background:rgba(255,255,255,.12);margin-top:6px;overflow:hidden}
.bar>i{display:block;height:100%}.pend{background:rgba(255,181,71,.15);color:var(--a);border-radius:12px;padding:10px 12px;margin-top:12px;font-weight:600}
svg{width:100%;height:170px;display:block}.tip{font-size:12px;color:var(--d);text-align:right;min-height:16px}
</style></head><body>
<h1 id="nm"></h1><div class="big" id="val"></div><div class="row" id="sub"></div>
<div id="pend"></div>
<div class="card"><svg id="ch" viewBox="0 0 340 170" preserveAspectRatio="none"></svg><div class="tip" id="tip">Touch the chart to read a day</div></div>
<div class="tabs"><div class="tab on" data-t="hold">Holdings</div><div class="tab" data-t="sig">Signals</div><div class="tab" data-t="log">Trades</div></div>
<div class="card" id="panel"></div>
<p class="dim" id="note"></p>
<script>
const d=${json};
const $=s=>document.querySelector(s);
const m=v=>v==null||isNaN(v)?'--':'$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const p=(v,k=2)=>v==null||isNaN(v)?'--':(v>0?'+':'')+Number(v).toFixed(k)+'%';
const c=v=>v==null||Math.abs(v)<.005?'var(--d)':v>0?'var(--g)':'var(--r)';
$('#nm').textContent=(d.name||'Paper $1K').toUpperCase()+' · '+(d.test_window||'');
$('#val').textContent=m(d.value);
const edge=(d.total_pct||0)-(d.spy_total_pct||0);
$('#sub').innerHTML='<span class="chip" style="background:rgba(255,255,255,.08);color:'+c(d.total_pct)+'">'+p(d.total_pct)+'</span><span style="color:'+c(edge)+';font-weight:700">vs SPY '+p(edge)+'</span><span class="dim">today '+p(d.day_pct)+'</span>';
if((d.pending||[]).length){$('#pend').innerHTML=d.pending.map(x=>'<div class="pend">🔔 Planned '+x.action+' '+x.ticker+' · '+m(x.dollars)+' at '+x.when+'<div class="dim" style="color:#e9c58a;margin-top:2px">'+(x.reason||'')+'</div></div>').join('');}
$('#note').textContent=(d.next_event||'')+' '+(d.note||'');
// chart
const H=(d.history||[]).filter(x=>x.value!=null&&x.spy!=null), svg=$('#ch');
if(H.length<2){svg.innerHTML='<line x1="0" y1="85" x2="340" y2="85" stroke="rgba(255,255,255,.15)"/><text x="170" y="105" fill="#8C97B2" font-size="12" text-anchor="middle">Chart starts after the first close</text>';}
else{const vals=H.flatMap(x=>[x.value,x.spy]).concat([1000]);let lo=Math.min(...vals),hi=Math.max(...vals);if(hi-lo<4){hi+=2;lo-=2}
const X=i=>6+i/(H.length-1)*328,Y=v=>8+(1-(v-lo)/(hi-lo))*154;
const path=k=>H.map((x,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(x[k]).toFixed(1)).join(' ');
const last=H[H.length-1],col=last.value>=last.spy?'#2BD67B':'#FF5C6C';
svg.innerHTML='<line x1="0" x2="340" y1="'+Y(1000)+'" y2="'+Y(1000)+'" stroke="rgba(255,255,255,.12)" stroke-dasharray="3 4"/>'+
'<path d="'+path('spy')+'" fill="none" stroke="#7C8BFF" stroke-width="1.6"/>'+
'<path d="'+path('value')+'" fill="none" stroke="'+col+'" stroke-width="2.6"/>'+
'<line id="cur" y1="0" y2="170" stroke="rgba(255,255,255,.35)" visibility="hidden"/>';
const move=e=>{const r=svg.getBoundingClientRect(),t=(e.touches?e.touches[0]:e),fx=(t.clientX-r.left)/r.width;
const i=Math.max(0,Math.min(H.length-1,Math.round(fx*(H.length-1)))),h=H[i],cur=$('#cur');cur.setAttribute('x1',X(i));cur.setAttribute('x2',X(i));cur.setAttribute('visibility','visible');
$('#tip').innerHTML=h.date+' · <b style="color:'+col+'">'+m(h.value)+'</b> · <span style="color:#7C8BFF">SPY '+m(h.spy)+'</span>';};
svg.addEventListener('touchstart',move);svg.addEventListener('touchmove',move);svg.addEventListener('mousemove',move);}
// tabs
const panels={
hold:()=>{const hs=d.holdings||[];if(!hs.length)return'<div class="dim">No positions yet. '+((d.pending||[]).length?'Orders are queued for the close.':'All cash.')+'</div>';
return hs.map(h=>{const ch=h.entry&&h.last?(h.last/h.entry-1)*100:null,room=h.last&&h.stop?(h.last-h.stop)/(h.entry-h.stop):1,f=Math.max(0,Math.min(1,room/1.5))*100,bc=room<.25?'var(--r)':room<.6?'var(--a)':'var(--g)';
return '<div class="h"><div style="flex:1"><span class="mono">'+h.ticker+'</span> <span class="dim">'+(h.shares!=null?Number(h.shares).toFixed(4)+' sh':'')+'</span><div class="dim">entry '+m(h.entry)+' · last '+m(h.last)+' · stop '+m(h.stop)+'</div><div class="bar"><i style="width:'+f+'%;background:'+bc+'"></i></div></div><div style="text-align:right;margin-left:10px"><div style="font-weight:700;color:'+c(ch)+'">'+p(ch,1)+'</div><div class="dim">'+m(h.last&&h.shares?h.last*h.shares:null)+'</div></div></div>'}).join('')+'<div class="dim" style="margin-top:6px">Cash '+m(d.cash)+'</div>';},
sig:()=>'<div class="dim" style="margin-bottom:6px">3-month momentum. Eligible = above 50-day avg. Top 3 eligible are held.</div>'+(d.signals||[]).map((s,i)=>'<div class="h"><span class="mono">'+(i+1)+'. '+s.ticker+'</span><span style="color:'+c(s.mom3m)+';font-weight:700">'+p(s.mom3m,1)+'</span><span class="dim">'+(s.vs50==null?'':p(s.vs50,1)+' vs 50d')+'</span><span>'+(s.eligible?'✅':'⛔️')+'</span></div>').join(''),
log:()=>{const t=(d.trades||[]).slice().reverse();return t.length?t.map(x=>'<div class="h"><div><span class="mono" style="color:'+(x.action==='BUY'?'var(--g)':'var(--r)')+'">'+x.action+' '+x.ticker+'</span><div class="dim">'+(x.reason||'')+'</div></div><div style="text-align:right"><div>'+m(x.dollars)+'</div><div class="dim">'+x.date+(x.price?' @ '+m(x.price):'')+'</div></div></div>').join(''):'<div class="dim">No fills yet.</div>';}};
const show=k=>{document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.t===k));$('#panel').innerHTML=panels[k]();};
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>show(t.dataset.t));show('hold');
</script></body></html>`;
}

// ---------- main ----------
const data = await loadData();
if (data) await notifyNewMoves(data);

if (config.runsInWidget) {
  const fam = config.widgetFamily;
  const w = !data ? errorWidget() : fam === "small" ? small(data) : fam === "large" ? large(data) : medium(data);
  w.url = URLScheme.forRunningScript();
  Script.setWidget(w);
} else if (data) {
  const wv = new WebView();
  await wv.loadHTML(dashboardHTML(data));
  await wv.present(true);
} else {
  const a = new Alert();
  a.title = "Paper $1K";
  a.message = "Couldn't load portfolio data.";
  a.addAction("OK");
  await a.present();
}
Script.complete();
