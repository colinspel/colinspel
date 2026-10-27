import json, pandas as pd, numpy as np
R = json.load(open('results.json'))
s = pd.read_pickle('data/standard.pkl')
sh = pd.read_pickle('data/shooting.pkl')

W, H = 360, 250
L, Rm, T, B = 40, 14, 16, 34


def sx(a, a0, a1): return L + (a - a0) / (a1 - a0) * (W - L - Rm)
def sy(v, v0, v1): return T + (v1 - v) / (v1 - v0) * (H - T - B)


def axes(a0, a1, v0, v1, yt, fmt, xlab, xt=None):
    out = []
    for v in yt:
        y = sy(v, v0, v1)
        out.append(f'<line x1="{L}" x2="{W-Rm}" y1="{y:.1f}" y2="{y:.1f}" class="grid{" zero" if v == 0 else ""}"/>'
                   f'<text x="{L-6}" y="{y+3.5:.1f}" class="tick" text-anchor="end">{fmt(v)}</text>')
    for a in (xt or range(a0, a1 + 1, 2)):
        x = sx(a, a0, a1)
        out.append(f'<text x="{x:.1f}" y="{H-B+15}" class="tick" text-anchor="middle">{a}</text>')
    out.append(f'<text x="{(L+W-Rm)/2}" y="{H-3}" class="axl" text-anchor="middle">{xlab}</text>')
    return ''.join(out)


def path(pts): return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)


# ---------- Chart 1: aging curves ----------
a0, a1, v0, v1 = 21, 32, -0.16, 0.06
c1 = [axes(a0, a1, v0, v1, [-0.15, -0.10, -0.05, 0, 0.05], lambda v: f'{v:+.2f}' if v else '0', 'Age (season start)')]
styles = {'Carrier': 'var(--s1)', 'Finisher': 'var(--s2)', 'All forwards': 'var(--ink3)'}
for name in ['Carrier', 'Finisher']:
    v = R['res'][name]
    ages = [a for a in range(a0, a1 + 1) if v['curve'][str(a)] is not None and v['lo'][str(a)] is not None]
    top = [(sx(a, a0, a1), sy(v['hi'][str(a)], v0, v1)) for a in ages]
    bot = [(sx(a, a0, a1), sy(v['lo'][str(a)], v0, v1)) for a in ages][::-1]
    c1.append(f'<path d="{path(top + bot)} Z" fill="{styles[name]}" opacity=".13"/>')
for name in ['All forwards', 'Carrier', 'Finisher']:
    v = R['res'][name]
    ages = [a for a in range(a0, a1 + 1) if v['curve'][str(a)] is not None]
    pts = [(sx(a, a0, a1), sy(v['curve'][str(a)], v0, v1)) for a in ages]
    dash = ' stroke-dasharray="4 3"' if name == 'All forwards' else ''
    c1.append(f'<path d="{path(pts)}" fill="none" stroke="{styles[name]}" stroke-width="2"{dash}/>')
    for a, (x, y) in zip(ages, pts):
        n = v['n'].get(str(a - 1)) if a > a0 else None
        c1.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="9" class="hit" data-tip="{name}, age {a}: {v["curve"][str(a)]:+.3f} npG/90 vs age 27"/>')
    lx, ly = pts[-1]
    (c1.append(f'<text x="{lx-4:.1f}" y="{ly + (-7 if name=="Carrier" else 14):.1f}" class="dl" text-anchor="end">{name}</text>') if name!='All forwards' else c1.append(f'<text x="{sx(29,a0,a1):.1f}" y="{sy(-0.135,v0,v1):.1f}" class="dl2" text-anchor="middle">All forwards</text>'))
chart1 = f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Aging curves">{"".join(c1)}</svg>'

# ---------- Chart 2: Kane actual vs expected ----------
kane = pd.DataFrame(R['kane'])
base = R['kane_base']
a0, a1, v0, v1 = 21, 32, 0.2, 1.2
c2 = [axes(a0, a1, v0, v1, [0.2, 0.4, 0.6, 0.8, 1.0], lambda v: f'{v:.1f}', 'Age (season start)')]
# expected band from age 28 on, using Finisher curve
fin = R['res']['Finisher']
ages = list(range(27, 33))
exp_pts = [(sx(a, a0, a1), sy(base + fin['curve'][str(a)], v0, v1)) for a in ages]
c2.append(f'<path d="{path(exp_pts)}" fill="none" stroke="var(--s2)" stroke-width="2" stroke-dasharray="4 3"/>')
c2.append(f'<text x="{exp_pts[-1][0]-2:.1f}" y="{exp_pts[-1][1]+14:.1f}" class="dl" text-anchor="end">Expected aging</text>')
y = sy(base, v0, v1)
c2.append(f'<line x1="{sx(24,a0,a1):.1f}" x2="{sx(28,a0,a1):.1f}" y1="{y:.1f}" y2="{y:.1f}" stroke="var(--ink3)" stroke-width="2"/>'
          f'<text x="{sx(24,a0,a1):.1f}" y="{y-6:.1f}" class="dl2">Prime 24–28: {base:.2f}</text>')
kp = [(sx(r.age, a0, a1), sy(r.npg90, v0, v1), r) for r in kane.itertuples()]
c2.append(f'<path d="{path([(x, y) for x, y, _ in kp])}" fill="none" stroke="var(--s1)" stroke-width="2"/>')
for x, y, r in kp:
    club = 'Bayern' if r.Season_End_Year >= 2024 else 'Spurs'
    ext = r.Season_End_Year == 2026
    c2.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="{"var(--bg)" if ext else "var(--s1)"}" stroke="var(--s1)" stroke-width="2"/>'
              f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" class="hit" data-tip="{int(r.Season_End_Year)-1}-{str(int(r.Season_End_Year))[2:]} ({club}), age {int(r.age)}: {r.npg90:.2f} npG/90, {int(r.npg)} non-pen goals in {int(r.mins)} min{" (outside dataset, see method)" if ext else ""}"/>')
lx, ly, _ = kp[-1]
c2.append(f'<text x="{lx-8:.1f}" y="{ly-8:.1f}" class="dl" text-anchor="end">Kane 2025-26: {kp[-1][2].npg90:.2f}</text>')
xb = sx(29.5, a0, a1)
c2.append(f'<line x1="{xb:.1f}" x2="{xb:.1f}" y1="{T}" y2="{H-B}" stroke="var(--ink3)" stroke-width="1" stroke-dasharray="2 3"/>'
          f'<text x="{xb-4:.1f}" y="{H-B-6}" class="dl2" text-anchor="end">Spurs | Bayern</text>')
chart2 = f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Kane actual versus expected">{"".join(c2)}</svg>'

# ---------- Chart 3: chance volume bars ----------
k = s[(s.Player == 'Harry Kane') & (s.Season_End_Year.between(2018, 2025))].sort_values('Season_End_Year')
ks = sh[(sh.Player == 'Harry Kane') & (sh.Season_End_Year.between(2018, 2025))].set_index('Season_End_Year')
rows = []
for r in k.itertuples():
    rows.append((int(r.Season_End_Year), r.npxG_Expected / r.Min_Playing * 90, r.G_minus_PK / r.Min_Playing * 90, ks.loc[r.Season_End_Year, 'Dist_Standard']))
H3 = 230
v1 = 1.0
bw = (W - L - Rm) / len(rows)
c3 = []
for v in [0, 0.25, 0.5, 0.75, 1.0]:
    y = T + (v1 - v) / v1 * (H3 - T - B)
    c3.append(f'<line x1="{L}" x2="{W-Rm}" y1="{y:.1f}" y2="{y:.1f}" class="grid"/><text x="{L-6}" y="{y+3.5:.1f}" class="tick" text-anchor="end">{v:.2f}</text>')
for i, (yr, xg, g, dist) in enumerate(rows):
    x = L + i * bw + bw * 0.18
    w = bw * 0.64
    y = T + (v1 - xg) / v1 * (H3 - T - B)
    base_y = H3 - B
    col = 'var(--s1)' if yr >= 2024 else 'var(--ink3)'
    c3.append(f'<path d="M{x:.1f},{base_y} V{y+4:.1f} Q{x:.1f},{y:.1f} {x+4:.1f},{y:.1f} H{x+w-4:.1f} Q{x+w:.1f},{y:.1f} {x+w:.1f},{y+4:.1f} V{base_y} Z" fill="{col}"/>')
    gy = T + (v1 - g) / v1 * (H3 - T - B)
    c3.append(f'<line x1="{x-2:.1f}" x2="{x+w+2:.1f}" y1="{gy:.1f}" y2="{gy:.1f}" stroke="var(--ink)" stroke-width="2"/>')
    c3.append(f'<rect x="{L+i*bw:.1f}" y="{T}" width="{bw:.1f}" height="{H3-T-B}" class="hitr" data-tip="{yr-1}-{str(yr)[2:]}: npxG/90 {xg:.2f}, actual npG/90 {g:.2f}, avg shot distance {dist:.1f} yd"/>')
    c3.append(f'<text x="{x+w/2:.1f}" y="{H3-B+15}" class="tick" text-anchor="middle">{str(yr-1)[2:]}-{str(yr)[2:]}</text>')
c3.append(f'<text x="{(L+W-Rm)/2}" y="{H3-3}" class="axl" text-anchor="middle">Season (grey = Spurs, blue = Bayern)</text>')
chart3 = f'<svg viewBox="0 0 {W} {H3}" role="img" aria-label="Kane chance volume">{"".join(c3)}</svg>'

spurs_xg = k[k.Season_End_Year <= 2023].npxG_Expected.sum() / k[k.Season_End_Year <= 2023].Min_Playing.sum() * 90
bay24 = rows[-2][1]

S = R['summary']
fin32 = R['res']['Finisher']['curve']['32']; car32 = R['res']['Carrier']['curve']['32']; all32 = R['res']['All forwards']['curve']['32']
fin29 = R['res']['Finisher']['curve']['29']; car29 = R['res']['Carrier']['curve']['29']
k26 = kane[kane.Season_End_Year == 2026].iloc[0]
exp32 = base + fin32
extra = (k26.npg90 - exp32) * k26.mins / 90

tbl_rows = ''.join(
    f'<tr><td>{a}</td><td>{R["res"]["All forwards"]["curve"][str(a)]:+.3f}</td><td>{R["res"]["Carrier"]["curve"][str(a)]:+.3f}</td><td>{R["res"]["Finisher"]["curve"][str(a)]:+.3f}</td></tr>'
    for a in range(22, 33))
lo = R['res']['Finisher']['lo']['32']; hi = R['res']['Finisher']['hi']['32']
clo = R['res']['Carrier']['lo']['32']; chi = R['res']['Carrier']['hi']['32']

html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Off the Curve</title>
<style>
:root{{--bg:#fcfcfb;--card:#f3f2ef;--ink:#0b0b0b;--ink2:#52514e;--ink3:#8a8984;--line:#e4e2dc;--s1:#2a78d6;--s2:#eb6834;color-scheme:light}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#1a1a19;--card:#242422;--ink:#f0efec;--ink2:#c3c2b7;--ink3:#8f8e86;--line:#34332f;--s1:#3987e5;--s2:#d95926;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#1a1a19;--card:#242422;--ink:#f0efec;--ink2:#c3c2b7;--ink3:#8f8e86;--line:#34332f;--s1:#3987e5;--s2:#d95926;color-scheme:dark}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif}}
main{{max-width:680px;margin:0 auto;padding:28px 16px 60px}}
.kick{{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink2);font-weight:600}}
h1{{font-size:34px;line-height:1.1;margin:6px 0 10px;letter-spacing:-.02em}}h2{{font-size:21px;margin:38px 0 6px;letter-spacing:-.01em}}
.dek{{color:var(--ink2);font-size:17px;margin:0 0 18px}}p{{margin:10px 0}}
.tiles{{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:22px 0}}
.tile{{background:var(--card);border-radius:12px;padding:14px}}.tile b{{display:block;font-size:28px;letter-spacing:-.02em;line-height:1.1}}.tile span{{font-size:13px;color:var(--ink2)}}
figure{{margin:16px 0 8px;background:var(--card);border-radius:12px;padding:12px 8px 6px;position:relative}}
figcaption{{font-size:13px;color:var(--ink2);padding:6px 8px 4px}}figure .t{{font-weight:600;font-size:15px;padding:0 8px}}
svg{{width:100%;height:auto;display:block}}.grid{{stroke:var(--line);stroke-width:1}}.grid.zero{{stroke:var(--ink3)}}
.tick{{font-size:10px;fill:var(--ink2)}}.axl{{font-size:10.5px;fill:var(--ink2)}}.dl{{font-size:11px;font-weight:600;fill:var(--ink)}}.dl2{{font-size:10.5px;fill:var(--ink2)}}
.hit,.hitr{{fill:transparent;cursor:pointer}}
.legend{{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--ink2);padding:2px 8px 6px}}.legend i{{display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:middle;margin-right:5px}}
#tip{{position:fixed;pointer-events:none;background:var(--ink);color:var(--bg);font-size:12.5px;padding:7px 9px;border-radius:8px;max-width:240px;opacity:0;transition:opacity .1s;z-index:9}}
table{{width:100%;border-collapse:collapse;font-size:13.5px;font-variant-numeric:tabular-nums}}th,td{{text-align:right;padding:6px 4px;border-bottom:1px solid var(--line)}}th:first-child,td:first-child{{text-align:left}}th{{color:var(--ink2);font-weight:600}}
details{{margin:12px 0;background:var(--card);border-radius:12px;padding:10px 14px}}summary{{cursor:pointer;font-weight:600}}
.note{{font-size:14px;color:var(--ink2)}}.call{{border-left:3px solid var(--s1);padding:2px 0 2px 12px;margin:16px 0}}
ul{{padding-left:20px}}li{{margin:6px 0}}footer{{margin-top:40px;font-size:13px;color:var(--ink2)}}
</style></head><body><main>
<div class="kick">Ballon d'Or 2026 · Striker aging</div>
<h1>Off the Curve</h1>
<p class="dek">Harry Kane won the Ballon d'Or in the season he started at age 32. I built striker aging curves from 15 years of Big 5 league data to measure how far off the curve that is, and tested my own theory for why. The theory failed.</p>

<div class="tiles">
<div class="tile"><b>{k26.npg90:.2f}</b><span>Kane non-penalty goals per 90, 2025-26 Bundesliga</span></div>
<div class="tile"><b>{exp32:.2f}</b><span>What a typical aging curve projected from his prime</span></div>
<div class="tile"><b>+{extra:.0f}</b><span>Non-penalty league goals above expected aging</span></div>
<div class="tile"><b>1st</b><span>Best rate of 155 forward seasons started at 32 since 2009-10</span></div>
</div>

<h2>The question</h2>
<p>Most aging curves say strikers peak in their mid-twenties and fade after 30. Kane just posted the best non-penalty scoring rate of any Big 5 forward season started at age 32 in the dataset, ahead of Lewandowski's 2021-22 (0.92) and Ronaldo's 2017-18 (0.91). Clubs price contracts and transfer fees off these curves, so a player this far above one is either a one-off or a sign the curve is wrong for his type.</p>
<p>My starting hypothesis: strikers who don't depend on dribbling and carrying age better, because acceleration is what leaves first. If true, a recruitment team should use a separate curve for "finishers" and pay more for them past 30.</p>

<h2>Finding 1: The finisher theory is wrong</h2>
<figure><div class="t">Change in non-penalty goals per 90, relative to age 27</div>
<div class="legend"><span><i style="background:var(--s1)"></i>Carriers</span><span><i style="background:var(--s2)"></i>Finishers</span><span><i style="background:var(--ink3)"></i>All forwards (dashed)</span></div>
{chart1}
<figcaption>Delta method, minutes-weighted. Shaded bands are 80% bootstrap intervals (players resampled, 400 draws). Tap a point for values.</figcaption></figure>
<p>Low-carry finishers decline earlier, not later. By 29 they've lost {abs(fin29):.3f} npG/90 relative to 27, while carriers are flat ({car29:+.3f}), and the 80% intervals don't overlap at that age. By 32 the finisher curve sits at {fin32:+.3f} (interval {lo:+.2f} to {hi:+.2f}); carriers at {car32:+.3f} ({clo:+.2f} to {chi:+.2f}). Past 30 the carrier sample thins out and the gap is inside the noise.</p>
<p class="call">My read, not tested here: finishers' output is tied to chance volume, so it drops when a club demotes them or they move down a level. Carriers create part of their own shots and hold value longer. A "buy the poacher, he'll age well" rule isn't supported here.</p>
<p>Kane also isn't a clean finisher. On a composite of take-ons, progressive carries and carries into the box at ages 29 and under, he sits at the {R["kane_carry_pct"]:.0f}th percentile of {sum(R["n_prof"].values())} profiled forwards, almost exactly the median. The two-bucket split can't describe him, which is a limit of the method, not just of the theory.</p>

<h2>Finding 2: Kane is off every curve</h2>
<figure><div class="t">Kane non-penalty goals per 90 by age vs expected aging</div>
<div class="legend"><span><i style="background:var(--s1)"></i>Kane actual</span><span><i style="background:var(--s2)"></i>Expected, finisher curve from his 24–28 prime</span></div>
{chart2}
<figcaption>League play only, 900+ minutes. Hollow point = 2025-26, added from bundesliga.com and StatMuse because the FBref extract ends at 2024-25.</figcaption></figure>
<p>From a prime baseline of {base:.2f} npG/90 at Spurs (ages 24–28), both the finisher curve and the all-forward curve project about {exp32:.2f} at 32. He produced {k26.npg90:.2f}. Over 2,377 minutes, that gap is about {extra:.0f} non-penalty Bundesliga goals the curve says shouldn't exist.</p>
<p>His two best rates of the last seven seasons both came after he turned 30, both at Bayern. That points at the move, not the body.</p>

<h2>Finding 3: The move changed his chances</h2>
<figure><div class="t">Kane chance volume: npxG per 90 (bars) vs actual npG per 90 (black tick)</div>
{chart3}
<figcaption>FBref npxG. Tap a season for shot distance.</figcaption></figure>
<p>At Spurs (2017-18 to 2022-23) Kane averaged {spurs_xg:.2f} npxG per 90. His first Bayern season jumped to {bay24:.2f}, with average shot distance down from roughly 17 yards to 14.4. Better chances explain most of the step up. They don't explain all of it: he outscored his npxG in every season but one, so the finishing hasn't aged either.</p>
<p>Penalties sit on top. He scored 10 Bundesliga penalties in 2025-26, more than in any Spurs league season. Aging curves ignore them by design. Ballon d'Or voters don't, and penalty conversion doesn't fade with sprint speed.</p>

<h2>What I'd tell a recruitment team</h2>
<ul>
<li>Don't model a 30+ striker on age alone. Model the chance environment he's moving into; a dominant side can more than offset the decline the curve predicts.</li>
<li>Don't assume low-dribble finishers age better. In this data they start declining around 28.</li>
<li>Profile on more than two buckets. Kane's mix of box finishing and deep creation is the profile worth its own curve, and two-way splits blur it.</li>
</ul>

<h2>Method</h2>
<p class="note">Data: FBref Big 5 league player-season tables, 2009-10 to 2024-25, via the worldfootballR_data release files. {R["n_forward_seasons"]:,} forward seasons from {R["n_forwards"]:,} players (listed FW in most seasons, 900+ league minutes, seasons summed across clubs). Metric: non-penalty goals per 90. Age is age at season start, FBref convention.</p>
<p class="note">Curves use the delta method: each player's change in npG/90 between consecutive qualifying seasons, weighted by the harmonic mean of minutes, averaged by age and chained. Ages with fewer than 15 pairs are dropped. Profiles: z-scored average of take-ons, progressive carries and carries into the penalty area per 90, from 2017-18 onward, using only seasons at age 29 or younger so aging doesn't leak into the label; median split. 2025-26 Kane figures (36 goals, 10 penalties, 2,377 minutes) come from bundesliga.com and StatMuse because the source extract stops at 2024-25.</p>

<details><summary>Limits a skeptic should push on</summary>
<ul class="note">
<li>Survivorship. The delta method only sees players who keep playing 900+ minutes. Strikers who fall off a cliff drop out, so every curve here understates decline after 30.</li>
<li>Small late samples. Only {R["surv31"]["Carrier"]} carriers and {R["surv31"]["Finisher"]} finishers have qualifying seasons at 31+. Treat the curves past 30 as direction, not size.</li>
<li>Profiles only exist from 2017-18, so profiled curves rest on 2017-25 transitions while the all-forward curve uses 2010-25.</li>
<li>No team-strength adjustment. Finding 3 suggests it matters; the next version should model npG/90 with team npxG share as a covariate.</li>
<li>League goals only. Kane's 61 all-competition goals and 6 World Cup goals aren't in the curve.</li>
</ul></details>

<details><summary>Curve values (npG/90 vs age 27)</summary>
<table><tr><th>Age</th><th>All</th><th>Carrier</th><th>Finisher</th></tr>{tbl_rows}</table></details>

<footer>Colin Spelman · <a href="https://www.linkedin.com/in/cspelman" style="color:inherit">LinkedIn</a> · Data: FBref via worldfootballR_data; bundesliga.com; StatMuse.</footer>
</main><div id="tip"></div>
<script>
const tip=document.getElementById('tip');
function show(e,t){{tip.textContent=t;tip.style.opacity=1;const x=(e.touches?e.touches[0].clientX:e.clientX),y=(e.touches?e.touches[0].clientY:e.clientY);
tip.style.left=Math.min(x+10,innerWidth-250)+'px';tip.style.top=(y-50)+'px'}}
document.querySelectorAll('[data-tip]').forEach(el=>{{['mouseenter','mousemove','touchstart'].forEach(ev=>el.addEventListener(ev,e=>show(e,el.dataset.tip),{{passive:true}}));el.addEventListener('mouseleave',()=>tip.style.opacity=0)}});
document.addEventListener('touchend',()=>setTimeout(()=>tip.style.opacity=0,1800));
</script></body></html>'''
open(__import__('os').environ.get('OUT','index.html'), 'w').write(html)
print('ok', exp32, extra, spurs_xg, bay24)
