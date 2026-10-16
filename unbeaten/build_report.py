"""Build outputs/unbeaten.html: one phone-first page with animated goals and season charts."""
import html
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT / "src"))
from player_js import PLAYER_CSS, PLAYER_JS, PLAYER_HTML, PITCH_SVG, THREE_JS

OUT = ROOT / "outputs"
A = json.loads((OUT / "analysis.json").read_text())
GOALS = json.loads((OUT / "goals.json").read_text())
esc = lambda s: html.escape(str(s), quote=True)


def mlabel(m):
    v = m["minute"] + 1
    if m["period"] == 1 and v > 45:
        return f"45+{v - 45}'"
    if m["period"] == 2 and v > 90:
        return f"90+{v - 90}'"
    return f"{v}'"
pct = lambda v: f"{100 * v:.0f}%"


def find_goal(date, scorer, minute):
    return next(i for i, g in enumerate(GOALS) if g["meta"]["date"] == date and g["meta"]["scorer"] == scorer
                and g["meta"]["minute"] == minute)


FEATURE_LONG = find_goal("2024-01-20", "Tella", 46)
FEATURE_LATE = find_goal("2024-03-30", "Schick", 90)
gl, gs = GOALS[FEATURE_LONG]["meta"], GOALS[FEATURE_LATE]["meta"]

# ------------------------------------------------------------------ small helpers for SVG pitches
def vpitch(x0=-3, y0=-3, w=86, h=126, extra="", cls="mini-pitch", label=""):
    return f"""<svg class="{cls}" viewBox="{x0} {y0} {w} {h}" role="img" aria-label="{esc(label)}">
<rect class="pitch-bg" x="-3" y="-3" width="86" height="126" rx="2"/>
<rect class="pitch-line" x="0" y="0" width="80" height="120"/><line class="pitch-line" x1="0" y1="60" x2="80" y2="60"/>
<circle class="pitch-line" cx="40" cy="60" r="10"/><rect class="pitch-line" x="18" y="0" width="44" height="18"/>
<rect class="pitch-line" x="30" y="0" width="20" height="6"/><rect class="pitch-line" x="18" y="102" width="44" height="18"/>
<rect class="pitch-line" x="30" y="114" width="20" height="6"/>{extra}</svg>"""


def P(x, y):
    """StatsBomb (x, y) in Leverkusen's attacking frame -> vertical SVG (attack up)."""
    return y, 120 - x


# ------------------------------------------------------------------ 0. season strip
def season_strip():
    res = A["season"]["results"]
    cells = []
    for i, r in enumerate(res):
        w = r["gf"] > r["ga"]
        cls = "win" if w else "draw"
        tip = f"{r['date']}|{'vs' if r['home'] else 'at'} {r['opp']}|{r['gf']}-{r['ga']} {'win' if w else 'draw'}"
        cells.append(f'<div class="cell {cls}" data-tip="{esc(tip)}"><span>{"W" if w else "D"}</span></div>')
    return f'<div class="strip" role="img" aria-label="34 league results: 28 wins, 6 draws, no losses">{"".join(cells)}</div>'


# ------------------------------------------------------------------ 1. build-up bars
def buildup_bars():
    B = A["buildup"]
    lev, opp = np.array(B["pass_dist"]["lev"]), np.array(B["pass_dist"]["opp"])
    lv, ov = lev / lev.sum(), opp / opp.sum()
    W, l, r, row = 360, 64, 40, 36
    H = row * len(B["pass_bins"]) + 26
    vmax = 0.55
    X = lambda v: l + v / vmax * (W - l - r)
    s = [f'<svg class="chart" viewBox="0 0 {W} {H}" role="img" aria-label="Share of goals by passes in the move">']
    for v in (0, .1, .2, .3, .4, .5):
        s.append(f'<line class="grid" x1="{X(v):.1f}" x2="{X(v):.1f}" y1="4" y2="{H - 20}"/>'
                 f'<text class="tick" x="{X(v):.1f}" y="{H - 6}" text-anchor="middle">{int(v * 100)}%</text>')
    for k, lab in enumerate(B["pass_bins"]):
        y = 6 + k * row
        s.append(f'<text class="rlabel" x="{l - 8}" y="{y + 16}" text-anchor="end">{lab} passes</text>')
        for j, (v, n, cls) in enumerate([(lv[k], lev[k], "lev"), (ov[k], opp[k], "opp")]):
            yy = y + j * 13
            w = max(X(v) - l, 0.5)
            s.append(f'<path class="bar {cls}" d="M{l},{yy} h{max(w - 3, 0.1):.1f} q3,0 3,3 v5 q0,3 -3,3 h{-max(w - 3, 0.1):.1f} z"/>')
            s.append(f'<text class="vlabel" x="{X(v) + 4:.1f}" y="{yy + 9}">{v * 100:.0f}%</text>')
            who = "Leverkusen" if cls == "lev" else "Opponents"
            s.append(f'<rect class="hit" x="0" y="{yy - 1}" width="{W}" height="13" data-tip="{esc(f"{who}|{lab} passes: {n} goals ({v * 100:.0f}%)")}"/>')
    s.append("</svg>")
    return "\n".join(s)


# ------------------------------------------------------------------ 2. pass network
def network_svg():
    N = A["network"]
    nodes = {n["pid"]: n for n in N["nodes"]}
    emax = max(e["n"] for e in N["edges"])
    smax = max(n["share"] for n in N["nodes"])
    rad = {n["pid"]: 2.2 + 3.2 * (n["share"] / smax) ** .8 for n in N["nodes"]}
    pos = {n["pid"]: np.array(P(n["x"], n["y"]), float) for n in N["nodes"]}
    # nudge overlapping nodes apart (labels need ~5 yards); positions are medians, so a
    # few yards of separation doesn't change the story
    for _ in range(200):
        moved = False
        for a in pos:
            for b in pos:
                if a >= b:
                    continue
                d = pos[b] - pos[a]; dist = np.hypot(*d) or 0.01
                need = rad[a] + rad[b] + 4.5
                if dist < need:
                    push = (need - dist) / 2 * d / dist
                    pos[a] -= push; pos[b] += push; moved = True
        if not moved:
            break
    extra = []
    for e in sorted(N["edges"], key=lambda e: e["n"]):
        a, b = nodes[e["a"]], nodes[e["b"]]
        (x1, y1), (x2, y2) = pos[e["a"]], pos[e["b"]]
        w = 0.25 + 2.4 * (e["n"] / emax) ** 1.3
        op = 0.25 + 0.6 * e["n"] / emax
        extra.append(f'<line class="edge" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke-width="{w:.2f}" style="opacity:{op:.2f}"/>')
        extra.append(f'<line class="hit-line" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" data-tip="{esc(f"{a["name"]} ↔ {b["name"]}|{e["n"]} completed passes")}"/>')
    for n in N["nodes"]:
        x, y = pos[n["pid"]]
        r = rad[n["pid"]]
        hl = " hl" if n["name"] == "Xhaka" else ""
        tip = f"{n['name']} #{n['num']}|In {n['share'] * 100:.0f}% of completed passes|{n['minutes']} minutes"
        extra.append(f'<g class="node{hl}" data-tip="{esc(tip)}"><circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}"/>'
                     f'<text x="{x:.1f}" y="{y:.1f}" class="num">{n["num"]}</text>'
                     f'<text x="{x:.1f}" y="{y + r + 2.6:.1f}" class="nlabel">{esc(n["name"])}</text></g>')
    return vpitch(-3, -3, 86, 126, "".join(extra), "net-pitch", "Season pass network")


# ------------------------------------------------------------------ 3. line breakers
def ranked_bars(rows, key, unit, cls="lev", W=360):
    l, r, row = 96, 44, 24
    H = row * len(rows) + 6
    vmax = max(x[key] for x in rows) * 1.08
    X = lambda v: l + v / vmax * (W - l - r)
    s = [f'<svg class="chart" viewBox="0 0 {W} {H}" role="img">']
    for k, p in enumerate(rows):
        y = 4 + k * row
        w = X(p[key]) - l
        s.append(f'<text class="rlabel" x="{l - 8}" y="{y + 12}" text-anchor="end">{esc(p["name"])} <tspan class="muted">#{p["num"]}</tspan></text>')
        s.append(f'<path class="bar {cls}" d="M{l},{y + 3} h{w - 3:.1f} q3,0 3,3 v6 q0,3 -3,3 h{-(w - 3):.1f} z"/>')
        s.append(f'<text class="vlabel" x="{X(p[key]) + 4:.1f}" y="{y + 12}">{p[key]:.1f}</text>')
        s.append(f'<rect class="hit" x="0" y="{y}" width="{W}" height="{row}" data-tip="{esc(f"{p["name"]}|{p[key]:.1f} {unit} per 90|{p["n"]} this season")}"/>')
    s.append("</svg>")
    return "\n".join(s)


def breaker_map():
    L = A["lines"]
    extra = []
    for x0, y0, x1, y1 in L["top_examples"]:
        (a, b), (c, d) = P(x0, y0), P(x1, y1)
        extra.append(f'<line class="lb" x1="{a:.1f}" y1="{b:.1f}" x2="{c:.1f}" y2="{d:.1f}"/>')
        extra.append(f'<circle class="lb-end" cx="{c:.1f}" cy="{d:.1f}" r=".55"/>')
    return vpitch(-3, -3, 86, 126, "".join(extra), "mini-pitch", f"{L['top_name']} line-breaking passes")


# ------------------------------------------------------------------ 4. late goals
def late_chart():
    Lg = A["late"]
    labels = Lg["labels"]
    lev, opp, gpg = Lg["xg_for_per90"], Lg["xg_against_per90"], Lg["goals_for_per90"]
    W, H, l, r, t, b = 360, 230, 30, 8, 16, 40
    vmax = 4.0
    n = len(labels)
    gw = (W - l - r) / n
    Y = lambda v: t + (1 - v / vmax) * (H - t - b)
    s = [f'<svg class="chart" viewBox="0 0 {W} {H}" role="img" aria-label="Expected goals per 90 by match period">']
    for v in (0, 1, 2, 3, 4):
        s.append(f'<line class="grid" x1="{l}" x2="{W - r}" y1="{Y(v):.1f}" y2="{Y(v):.1f}"/>'
                 f'<text class="tick" x="{l - 5}" y="{Y(v) + 3.5:.1f}" text-anchor="end">{v}</text>')
    bw = (gw - 10) / 2
    for k in range(n):
        x = l + k * gw + 5
        for j, (v, cls) in enumerate([(lev[k], "lev"), (opp[k], "opp")]):
            xx = x + j * (bw + 1.5)
            h = H - b - Y(v)
            s.append(f'<path class="bar {cls}" d="M{xx:.1f},{H - b} v{-(h - 3):.1f} q0,-3 3,-3 h{bw - 6:.1f} q3,0 3,3 v{h - 3:.1f} z"/>')
        # actual Leverkusen goals per 90 as a marker over their bar
        gx = x + bw / 2
        s.append(f'<line class="gmark" x1="{gx - bw / 2 + 1:.1f}" x2="{gx + bw / 2 - 1:.1f}" y1="{Y(gpg[k]):.1f}" y2="{Y(gpg[k]):.1f}"/>')
        s.append(f'<text class="tick" x="{x + gw / 2 - 5:.1f}" y="{H - b + 14}" text-anchor="middle">{labels[k]}</text>')
        tip = (f"Minutes {labels[k]}|Leverkusen xG/90: {lev[k]:.2f}|Leverkusen goals/90: {gpg[k]:.2f}|"
               f"Opponent xG/90: {opp[k]:.2f}|{int(Lg['goals_for'][k])} goals scored, {int(Lg['goals_against'][k])} conceded")
        s.append(f'<rect class="hit" x="{l + k * gw:.1f}" y="{t}" width="{gw:.1f}" height="{H - t - b}" data-tip="{esc(tip)}"/>')
    s.append(f'<text class="axis-title" x="{(l + W - r) / 2:.1f}" y="{H - 8}" text-anchor="middle">Match minute (stoppage time included in 45+ and 90+)</text>')
    s.append("</svg>")
    return "\n".join(s)


# ------------------------------------------------------------------ 5. regains heat
def regain_grid(key):
    R = A["regains"][key]
    G = np.array(R["grid"])          # [6 bands along x][4 across y]
    vmax = 0.10
    extra = []
    for i in range(6):
        for j in range(4):
            v = G[i, j]
            sx, sy = j * 20, 120 - (i + 1) * 20
            step = min(8, int(v / vmax * 8))
            extra.append(f'<rect x="{sx + .6}" y="{sy + .6}" width="18.8" height="18.8" rx="1.5" class="heat h{step}" '
                         f'data-tip="{esc(f"{v * 100:.1f}% of regains")}"/>'
                         f'<text x="{sx + 10}" y="{sy + 11.2}" class="hlabel">{v * 100:.0f}%</text>')
    return vpitch(-3, -3, 86, 126, "".join(extra), "mini-pitch", "Where possession was won back")


# ------------------------------------------------------------------ numbers for the text
S = A["season"]; B = A["buildup"]; N = A["network"]; L = A["lines"]; LG = A["late"]; RG = A["regains"]
bl, bo = B["goals"]["lev"], B["goals"]["opp"]
xh = next(n for n in N["nodes"] if n["name"] == "Xhaka")
wirtz_r = next(p for p in L["receivers"] if p["name"] == "Wirtz")
xh_lb = next(p for p in L["players"] if p["name"] == "Xhaka")
flips = LG["flips"]
loss_flips = [f for f in flips if f["becomes_loss"]]
late_lev_goals = int(LG["goals_for"][5] + LG["goals_for"][6])
rl, ro = RG["lev"], RG["opp"]

flip_rows = "".join(
    f"<tr><td>{'vs' if f['home'] else 'at'} {esc(f['opponent'])}<br><span class='ci'>{f['date']}</span></td>"
    f"<td class='num'>{f['final']}</td><td class='num'>{f['without']}</td>"
    f"<td class='num'>{', '.join((str(m) if m <= 90 else '90+' + str(m - 90)) + chr(39) for m in f['late_minutes'])}</td></tr>"
    for f in flips)

goals_table = "".join(
    f"<tr><td>{esc(g['meta']['scorer'])} {mlabel(g['meta'])}<br><span class='ci'>{'vs' if g['meta']['home'] else 'at'} {esc(g['meta']['opponent'])}</span></td>"
    f"<td class='num'>{g['meta']['poss_passes']}</td><td class='num'>{g['meta']['xg']:.2f}</td><td>{esc(g['meta']['pattern'])}</td></tr>"
    for g in sorted(GOALS, key=lambda g: -g["meta"]["poss_passes"])[:8])

CSS = """
:root{--surface:#fcfcfb;--page:#f9f9f7;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;--grid:#e1e0d9;--axis:#c3c2b7;
--border:rgba(11,11,11,.10);--lev:#d7192d;--lev-ring:#fff;--opp:#7a7f8a;--pitch:#e8eee4;--pitch-line:#b3c0ad;--trail:#3a3a3a;
--h0:#f4f1ee;--h1:#fbdcd8;--h2:#f7c0b9;--h3:#f1a398;--h4:#e98577;--h5:#df6656;--h6:#d24636;--h7:#b9301f;--h8:#8f2214;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--surface:#1a1a19;--page:#0d0d0d;--ink:#f0efec;--ink2:#c3c2b7;
--muted:#898781;--grid:#2c2c2a;--axis:#383835;--border:rgba(255,255,255,.10);--lev:#ef3c4b;--lev-ring:#1a1a19;--opp:#8d929c;
--pitch:#17201a;--pitch-line:#34443a;--trail:#d8d8d8;--h0:#20221f;--h1:#3a1f1d;--h2:#552321;--h3:#702824;--h4:#8c2e28;
--h5:#a9352d;--h6:#c63d33;--h7:#e04a3e;--h8:#f2695b;color-scheme:dark}}
:root[data-theme="dark"]{--surface:#1a1a19;--page:#0d0d0d;--ink:#f0efec;--ink2:#c3c2b7;--muted:#898781;--grid:#2c2c2a;--axis:#383835;
--border:rgba(255,255,255,.10);--lev:#ef3c4b;--lev-ring:#1a1a19;--opp:#8d929c;--pitch:#17201a;--pitch-line:#34443a;--trail:#d8d8d8;
--h0:#20221f;--h1:#3a1f1d;--h2:#552321;--h3:#702824;--h4:#8c2e28;--h5:#a9352d;--h6:#c63d33;--h7:#e04a3e;--h8:#f2695b;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-text-size-adjust:100%}
main{max-width:720px;margin:0 auto;padding:20px 16px 64px}
h1{font-size:2rem;line-height:1.1;margin:.15em 0 .3em;letter-spacing:-.02em}
h2{font-size:1.25rem;margin:2.2em 0 .3em;padding-top:.7em;border-top:1px solid var(--border)}
.kicker{font-size:.8rem;color:var(--lev);font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin:0}
.byline{color:var(--ink2);font-size:.88rem;margin:0}
p{margin:.6em 0}.lede{font-size:1.08rem}
.q{font-weight:650;color:var(--ink2);font-size:.92rem;margin-bottom:.2em}
.strip{display:grid;grid-template-columns:repeat(17,1fr);gap:3px;margin:14px 0 4px}
.cell{aspect-ratio:1;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:700;cursor:pointer}
.cell.win{background:var(--lev);color:#fff}.cell.draw{background:var(--opp);color:#fff}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
.tile{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px}
.tile .v{font-size:1.45rem;font-weight:700;line-height:1.1}.tile .k{font-size:.76rem;color:var(--ink2);margin-top:3px}
figure{margin:14px 0;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 10px 10px}
figcaption{font-size:.84rem;color:var(--ink2);margin-top:6px}
.fig-title{font-weight:650;font-size:.95rem;margin:0 0 6px}
.legend{display:flex;gap:14px;font-size:.8rem;color:var(--ink2);margin:0 0 6px;flex-wrap:wrap}
.legend i{display:inline-block;width:11px;height:11px;border-radius:3px;vertical-align:-1px;margin-right:5px}
svg.chart{width:100%;height:auto;display:block}
.mini-pitch,.net-pitch{width:100%;max-width:420px;height:auto;display:block;margin:0 auto}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.two .lab{text-align:center;font-size:.85rem;font-weight:600;margin-bottom:4px}
.grid{stroke:var(--grid);stroke-width:1}.tick{fill:var(--muted);font-size:10px;font-variant-numeric:tabular-nums}
.axis-title{fill:var(--muted);font-size:10px}.rlabel{fill:var(--ink);font-size:11.5px}.muted{fill:var(--muted)}
.vlabel{fill:var(--ink2);font-size:10.5px;font-variant-numeric:tabular-nums}
.bar.lev{fill:var(--lev)}.bar.opp{fill:var(--opp)}.gmark{stroke:var(--ink);stroke-width:2.2;stroke-linecap:round}
.hit{fill:transparent;cursor:pointer}.hit-line{stroke:transparent;stroke-width:3;cursor:pointer}
.edge{stroke:var(--lev);stroke-linecap:round}
.node circle{fill:var(--lev);stroke:var(--lev-ring);stroke-width:.5}.node.hl circle{stroke:var(--ink);stroke-width:.8}
.node .num{fill:#fff;font-size:2.4px;font-weight:700;text-anchor:middle;dominant-baseline:central}
.nlabel{fill:var(--ink);font-size:2.6px;font-weight:600;text-anchor:middle;paint-order:stroke;stroke:var(--pitch);stroke-width:.7px}
.node{cursor:pointer}
.lb{stroke:var(--lev);stroke-width:.3;opacity:.35}.lb-end{fill:var(--lev);opacity:.6}
.heat{cursor:pointer}.h0{fill:var(--h0)}.h1{fill:var(--h1)}.h2{fill:var(--h2)}.h3{fill:var(--h3)}.h4{fill:var(--h4)}.h5{fill:var(--h5)}
.h6{fill:var(--h6)}.h7{fill:var(--h7)}.h8{fill:var(--h8)}
.hlabel{font-size:4.2px;font-weight:650;text-anchor:middle;fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:.9px;pointer-events:none}
table{width:100%;border-collapse:collapse;font-size:.88rem;margin:10px 0;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden}
th,td{padding:7px 8px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
th{font-size:.76rem;color:var(--ink2);font-weight:600}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.ci{color:var(--muted);font-size:.78rem}
.callout{background:var(--surface);border-left:3px solid var(--lev);border-radius:6px;padding:10px 14px;margin:14px 0}
details{margin:8px 0}summary{cursor:pointer;color:var(--ink2);font-size:.88rem}
#tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--page);font-size:.8rem;line-height:1.35;padding:6px 8px;border-radius:6px;
display:none;z-index:9;max-width:240px;box-shadow:0 2px 8px rgba(0,0,0,.2)}
footer{margin-top:40px;font-size:.8rem;color:var(--ink2)}
"""

TIP_JS = """
const tip=document.getElementById('tip');
function show(e,el){tip.innerHTML=el.dataset.tip.split('|').map((s,i)=>i?s:'<b>'+s+'</b>').join('<br>');tip.style.display='block';
 const x=e.clientX,y=e.clientY,w=tip.offsetWidth;tip.style.left=Math.min(innerWidth-w-8,Math.max(8,x-w/2))+'px';tip.style.top=Math.max(8,y-tip.offsetHeight-14)+'px';}
document.querySelectorAll('[data-tip]').forEach(el=>{el.addEventListener('pointermove',e=>show(e,el));el.addEventListener('pointerdown',e=>show(e,el));
 el.addEventListener('pointerleave',()=>tip.style.display='none');});
addEventListener('scroll',()=>tip.style.display='none',{passive:true});
"""

body = f"""
<main>
<p class="kicker">Bayer Leverkusen · Bundesliga 2023-24</p>
<h1>Unbeaten</h1>
<p class="byline">Colin Spelman · Built on Hudl StatsBomb free event and 360 data · October 2026</p>
<p class="lede">{S['won']} wins, {S['drawn']} draws, {S['lost']} losses. {S['points']} points, {S['gf']} goals scored, {S['ga']} conceded.
This is how Xabi Alonso's side did it, told through every one of their {len(GOALS)} non-penalty goals and five questions about how they played.</p>
{season_strip()}
<p class="ci">Each square is a league match in date order. Red = win, grey = draw. Tap for the score.</p>

<h2>Watch the goals</h2>
<p>Every goal below is rebuilt from data. Leverkusen are in red, opponents in white. Every touch of the ball is placed at its recorded location and time.
Everyone else comes from StatsBomb's 360 freeze frames, which capture every player the broadcast camera could see at each on-ball event,
with movement between frames smoothed.</p>
<p>Each goal opens in a <b>3D game view</b>: a broadcast-style camera behind the attack, with every tracked player rendered as a 3D footballer
in team colours with his shirt number, running, turning and leaning according to the data. The player on the ball is placed exactly where each event happened,
so passes arrive at the receiver's feet and carries keep the ball with the carrier. Passes travel on the ground or in the air by StatsBomb's recorded pass height.
The figures are generic, not likenesses; the camera, kits and stadium are styling and the positions underneath are the data.
Switch to <b>tactical view</b> for the top-down version.</p>
<p class="q">The longest move: {gl['poss_passes']} passes from kick-off</p>
{PLAYER_HTML.format(start=FEATURE_LONG, pitch=PITCH_SVG)}
<p class="q">The late winner: {gs['scorer']} at {mlabel(gs)} against {gs['opponent']}</p>
{PLAYER_HTML.format(start=FEATURE_LATE, pitch=PITCH_SVG)}
<p class="ci">Use the arrows or the menu to play any of the {len(GOALS)} goals. Penalties and own goals are excluded.
A few clips have little or no 360 coverage, so they show the ball only.</p>

<h2>1. How were the goals built?</h2>
<p>Leverkusen's goals came from longer moves than the goals they conceded. The median Leverkusen goal followed {bl['median_passes']:.0f} passes in the same possession,
against {bo['median_passes']:.1f} for their opponents. {pct(bl['share_10plus'])} of their goals came after 10 or more passes, and {pct(bl['share_started_own_half'])} started in their own half.
They could also score quickly: {pct(bl['share_0to2'])} came after 2 passes or fewer, mostly set pieces and counters.</p>
<figure><p class="fig-title">Share of goals by passes in the move</p>
<div class="legend"><span><i style="background:var(--lev)"></i>Leverkusen ({bl['n']} goals)</span><span><i style="background:var(--opp)"></i>Opponents ({bo['n']} goals)</span></div>
{buildup_bars()}
<figcaption>Non-penalty goals only. Opponent baseline is small (n = {bo['n']}): read it as a contrast, not a precise rate.</figcaption></figure>
<details><summary>The eight longest moves</summary>
<table><thead><tr><th>Goal</th><th class="num">Passes</th><th class="num">xG</th><th>Started from</th></tr></thead><tbody>{goals_table}</tbody></table></details>

<h2>2. Who made it tick?</h2>
<p>Granit Xhaka was involved in {pct(xh['share'])} of Leverkusen's {N['total_passes']:,} completed open-play passes, as passer or receiver. No one else was above {pct(sorted([n['share'] for n in N['nodes']])[-2])}.
The network shows the shape: a back three, Xhaka and a partner in midfield, wingbacks Grimaldo and Frimpong stretched wide, and Wirtz and Hofmann between the lines.</p>
<figure><p class="fig-title">Season pass network, 11 most-used players</p>
{network_svg()}
<figcaption>Dots sit at each player's median pass and reception location; size = share of completed passes involved in; line width = passes between the pair.
Leverkusen attack upwards. Overlapping dots (Xhaka, Palacios, Andrich share the middle) are nudged a few yards apart so labels stay readable.
Boniface misses the cut because injury limited his minutes.</figcaption></figure>

<h2>3. Who broke the lines, and who received?</h2>
<p>Using 360 freeze frames, I counted a pass as line-breaking if it was completed, gained at least 10 yards and went past at least 3 visible outfield opponents.
Leverkusen played {L['team']['lev_per_match']:.0f} of these per match, against {L['team']['opp_per_match']:.0f} for their opponents. The rate per completed pass was about the same
({L['team']['lev_rate'] * 100:.1f}% vs {L['team']['opp_rate'] * 100:.1f}%): the gap is volume, because they had the ball far more.</p>
<p>The roles split cleanly. Xhaka played {xh_lb['per90']:.1f} line-breaking passes per 90, the most in the squad. The players receiving them were the wingbacks and the two attacking midfielders:
Frimpong, Wirtz ({wirtz_r['per90']:.1f} per 90) and Hofmann.</p>
<figure><p class="fig-title">Line-breaking passes played, per 90</p>{ranked_bars(L['players'][:6], 'per90', 'line-breaking passes')}</figure>
<figure><p class="fig-title">Line-breaking passes received, per 90</p>{ranked_bars(L['receivers'][:6], 'per90', 'line-breaking passes received')}</figure>
<figure><p class="fig-title">All {len(L['top_examples'])} of {L['top_name']}'s line-breaking passes</p>{breaker_map()}
<figcaption>Each line is one pass; the dot is where it arrived. Leverkusen attack upwards. Minimum {L['min_minutes']} minutes for the rankings.</figcaption></figure>

<h2>4. Were the late goals luck?</h2>
<p>Take away Leverkusen's goals from the 85th minute on and the season changes: {LG['late_points']['85']} fewer points and {len(loss_flips)} defeats.
There is no unbeaten season without them.</p>
<table><thead><tr><th>Match</th><th class="num">Final</th><th class="num">Without</th><th class="num">Late goals</th></tr></thead><tbody>{flip_rows}</tbody></table>
<p>So was it luck? Partly, but not mostly. The chances were real: minutes 75 to 85 were Leverkusen's most dangerous spell of any match period ({LG['xg_for_per90'][5]:.2f} xG per 90),
and the final minutes ran at {LG['xg_for_per90'][6]:.2f}, level with their first-half peak. They also finished well above that: {int(LG['goals_after85'])} goals from {LG['xg_after85']:.1f} xG after the 85th minute.
The pressure looks like a repeatable habit. Scoring about {int(LG['goals_after85'] - LG['xg_after85'])} more late goals than the chances deserved is the part you'd bet against happening again.</p>
<figure><p class="fig-title">Expected goals per 90 minutes, by period</p>
<div class="legend"><span><i style="background:var(--lev)"></i>Leverkusen xG</span><span><i style="background:var(--opp)"></i>Opponent xG</span><span><i style="background:var(--ink);height:3px;border-radius:2px"></i>Leverkusen actual goals</span></div>
{late_chart()}
<figcaption>Per 90 minutes played in each period, so stoppage time doesn't inflate the late bars. Tap a period for counts.</figcaption></figure>

<h2>5. Where did they win the ball back?</h2>
<p>{pct(rl['share_final_third'])} of Leverkusen's ball regains came in the attacking third, against {pct(ro['share_final_third'])} for their opponents. That is {rl['final_third_regains']} high regains across the season,
{rl['final_third_regains'] / 34:.0f} a match. About a third of them ({pct(rl['shot_rate'])}) led to a shot within 15 seconds, the same rate as their opponents ({pct(ro['shot_rate'])}).
The edge was not converting high regains better. It was having nearly twice as many.</p>
<figure><p class="fig-title">Share of ball regains by pitch zone</p>
<div class="two"><div><div class="lab">Leverkusen ({rl['n']:,})</div>{regain_grid('lev')}</div><div><div class="lab">Opponents ({ro['n']:,})</div>{regain_grid('opp')}</div></div>
<figcaption>Each team attacks upwards. Regains = successful ball recoveries, interceptions and won tackles.</figcaption></figure>

<h2>What travels from this</h2>
<p>Three things a recruitment or analysis team could take from the season. Possession volume, not efficiency, was the edge: line-breaking rate and high-regain conversion were average,
the amount was not. The midfield ran through one player to an unusual degree, which is a strength until he's missing. And the late-goal run was built on real pressure
but finished at a rate that should be expected to cool.</p>

<h2>Method and limits</h2>
<p><b>Data:</b> Hudl StatsBomb free release of all 34 Leverkusen Bundesliga matches, 2023-24: events, lineups and 360 freeze frames. Only Leverkusen's matches are included,
so every baseline is "their opponents in the same games", not the league.</p>
<p><b>Animations:</b> ball path from event locations, end points and timestamps; players from 360 frames and the named shot freeze frame. The player on the ball is identified at every event;
other dots are linked between frames by minimum-distance matching with a speed limit, starting from the named shot frame and working backwards. Players off camera for more than 3 seconds
fade out instead of being shown on an invented path. Unnamed Leverkusen dots appear lighter.</p>
<p><b>Definitions:</b> line-breaking pass = completed open-play pass, 10+ yards forward, past 3+ visible outfield opponents (camera coverage means this undercounts). Regain = successful ball recovery,
interception or won tackle. xG = StatsBomb's model.</p>
<p><b>Code:</b> Python (NumPy, SciPy for the assignment step) and three.js for the 3D view. Full source and run instructions on
<a href="https://github.com/colinspel/colinspel/tree/main/unbeaten">GitHub</a>.</p>
<footer>Data: Hudl StatsBomb open data. Built by Colin Spelman ·
<a href="https://github.com/colinspel/colinspel/tree/main/unbeaten">Code on GitHub</a> · <a href="https://www.linkedin.com/in/cspelman">LinkedIn</a> · csatletico14@icloud.com</footer>
</main><div id="tip" role="status"></div>
"""

page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unbeaten · Leverkusen 2023-24 rebuilt from data</title><meta name="description" content="How Bayer Leverkusen went unbeaten in 2023-24, with all 78 non-penalty goals rebuilt in 3D from StatsBomb data.">
<meta property="og:type" content="article"><meta property="og:title" content="Unbeaten: Leverkusen 2023-24, rebuilt from data">
<meta property="og:description" content="All 78 non-penalty goals rebuilt in 3D from StatsBomb event and 360 data, plus five questions about how the season was won.">
<meta property="og:url" content="https://colinspel.github.io/unbeaten/"><meta property="og:image" content="https://colinspel.github.io/unbeaten/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="627"><meta name="twitter:card" content="summary_large_image">
<meta name="author" content="Colin Spelman">
<style>{CSS}{PLAYER_CSS}</style></head><body>{body}
<script>{THREE_JS}</script>
<script>window.GOALS={json.dumps(GOALS, separators=(",", ":"))};{TIP_JS}{PLAYER_JS}</script></body></html>"""
(OUT / "unbeaten.html").write_text(page, encoding="utf-8")
print("wrote", round(len(page) / 1024), "KB")
