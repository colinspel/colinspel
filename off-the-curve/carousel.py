"""Builds the LinkedIn carousel (1080x1350 slides) as PDF + PNGs."""
import os, json, re
import pandas as pd
os.environ['OUT'] = '_tmp.html'
ns = {}
exec(open('build.py').read(), ns)
chart1, chart2, chart3 = ns['chart1'], ns['chart2'], ns['chart3']
R = ns['R']; base = ns['base']; exp32 = ns['exp32']; extra = ns['extra']; spurs_xg = ns['spurs_xg']; bay24 = ns['bay24']
fin29 = R['res']['Finisher']['curve']['29']; car29 = R['res']['Carrier']['curve']['29']

# top age-32 seasons (league, 900+ min), plus Kane 2025-26 from external sources
src = open('analysis.py').read().split('# ---- style profile')[0]
g = {}; exec(src, g); F = g['F']
top = F[F.age == 32].nlargest(4, 'npg90')[['player', 'Season_End_Year', 'npg90']]
rows = [('Harry Kane', '2025-26', 0.98)] + [(r.player, f'{int(r.Season_End_Year)-1}-{str(int(r.Season_End_Year))[2:]}', r.npg90) for r in top.itertuples()]
n32 = int((F.age == 32).sum())

bars = ''
for i, (pl, ssn, v) in enumerate(rows):
    w = v / 1.0 * 100
    bars += f'''<div class="br"><div class="bl"><b>{pl}</b> <span>{ssn}</span></div>
<div class="bt"><div class="bf{' k' if i == 0 else ''}" style="width:{w:.1f}%"></div><em>{v:.2f}</em></div></div>'''

N = 7
def foot(i): return f'<div class="ft"><span>Colin Spelman</span><span>{i}/{N}</span></div>'

slides = [
f'''<div class="s cover"><div class="kick">Ballon d'Or 2026</div>
<h1>Kane won it at 32.<br><span class="o">The aging curve said he shouldn't have.</span></h1>
<div class="duo"><div><b class="bl1">0.98</b><span>non-penalty goals per 90<br>2025-26 Bundesliga</span></div>
<div><b class="o">{exp32:.2f}</b><span>what a typical striker<br>aging curve projected</span></div></div>
<p class="sub">I built aging curves from 6,114 Big 5 forward seasons to find out why. My first theory was wrong.</p>
<div class="swipe">Swipe →</div>{foot(1)}</div>''',

f'''<div class="s"><div class="kick">The record</div>
<h2>Best scoring rate of any forward season started at 32</h2>
<p class="lead">Non-penalty goals per 90, Big 5 leagues since 2009-10. {n32} qualifying seasons (900+ minutes).</p>
<div class="bars">{bars}</div>
<p class="note">Kane's 2025-26 from bundesliga.com and StatMuse (36 goals, 10 penalties, 2,377 min). All other seasons: FBref.</p>{foot(2)}</div>''',

f'''<div class="s"><div class="kick">The gap</div>
<h2>About {extra:.0f} non-penalty league goals the curve says shouldn't exist</h2>
<div class="fig">{chart2}</div>
<p class="lead">From his Spurs prime of {base:.2f} per 90 (ages 24–28), aging projected {exp32:.2f} at 32. He produced 0.98.</p>{foot(3)}</div>''',

f'''<div class="s"><div class="kick">My theory</div>
<h2>"Finishers age better than dribblers." <span class="o">The data says the opposite.</span></h2>
<div class="lg"><span><i style="background:var(--s1)"></i>Carriers</span><span><i style="background:var(--s2)"></i>Finishers</span><span><i style="background:var(--ink3)"></i>All forwards</span></div>
<div class="fig">{chart1}</div>
<p class="lead">Low-carry finishers are already down {abs(fin29):.2f} per 90 by 29. Carriers are flat. Kane sits at the median on carrying anyway.</p>{foot(4)}</div>''',

f'''<div class="s"><div class="kick">What changed</div>
<h2>Bayern gave him better chances</h2>
<div class="fig">{chart3}</div>
<p class="lead">npxG per 90 went from {spurs_xg:.2f} at Spurs to {bay24:.2f} in his first Bayern season. He still beat his xG in 7 of 8 seasons, so the finishing hasn't aged either.</p>{foot(5)}</div>''',

f'''<div class="s"><div class="kick">For a recruitment team</div>
<h2>Price the environment, not just the age</h2>
<ol class="take">
<li><b>Model the chance volume he's moving into.</b> A dominant side can more than cancel the decline a curve predicts.</li>
<li><b>Don't assume poachers age well.</b> In this data, low-carry finishers start dropping around 28.</li>
<li><b>Two profile buckets aren't enough.</b> Kane's mix of box finishing and deep creation needs its own curve.</li>
</ol>{foot(6)}</div>''',

f'''<div class="s"><div class="kick">Method & limits</div>
<h2>How it was built</h2>
<ul class="meth">
<li>FBref Big 5 player seasons, 2009-10 to 2024-25. Forwards with 900+ league minutes.</li>
<li>Delta method: year-over-year change in non-penalty goals per 90, minutes-weighted, chained by age. 80% bootstrap intervals.</li>
<li>Profiles from take-ons, progressive carries and box carries at ages 29 and under, median split.</li>
<li>Limits: survivorship bias understates late decline; under 50 players per profile past 31; no team-strength adjustment yet.</li>
</ul>
<div class="cta">Full project, code and data on my GitHub<br><b>github.com/colinspel</b></div>{foot(7)}</div>''',
]

css = '''
:root{--bg:#121417;--card:#1c1f24;--ink:#f3f2ee;--ink2:#b9b8b0;--ink3:#8f8e86;--line:#2e3138;--s1:#3987e5;--s2:#e9692f}
*{box-sizing:border-box}body{margin:0;background:#000;font-family:-apple-system,"Inter","Segoe UI",sans-serif}
.s{width:1080px;height:1350px;background:var(--bg);color:var(--ink);padding:84px 80px 0;position:relative;overflow:hidden;page-break-after:always}
.kick{font-size:26px;letter-spacing:.14em;text-transform:uppercase;color:var(--s1);font-weight:700;margin-bottom:22px}
h1{font-size:84px;line-height:1.04;letter-spacing:-.03em;margin:0 0 56px}
h2{font-size:58px;line-height:1.08;letter-spacing:-.025em;margin:0 0 30px}
.o{color:var(--s2)}.bl1{color:var(--s1)}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:48px}
.duo div{background:var(--card);border-radius:24px;padding:34px}.duo b{display:block;font-size:120px;line-height:1;letter-spacing:-.04em;margin-bottom:14px}.duo span{font-size:27px;color:var(--ink2);line-height:1.35}
.sub{font-size:34px;line-height:1.4;color:var(--ink2);margin:0}
.swipe{position:absolute;right:80px;bottom:120px;font-size:30px;font-weight:700;color:var(--s1)}
.lead{font-size:33px;line-height:1.42;color:var(--ink2);margin:26px 0 0}.note{font-size:22px;color:var(--ink3);margin-top:34px;line-height:1.4}
.fig{background:var(--card);border-radius:24px;padding:24px 10px 10px}.fig svg{width:100%;height:auto;display:block}
.grid{stroke:var(--line);stroke-width:1}.grid.zero{stroke:var(--ink3)}.tick{font-size:10px;fill:var(--ink2)}.axl{font-size:10.5px;fill:var(--ink2)}
.dl{font-size:11px;font-weight:600;fill:var(--ink)}.dl2{font-size:10.5px;fill:var(--ink2)}.hit,.hitr{fill:transparent}
.lg{display:flex;gap:30px;font-size:26px;color:var(--ink2);margin:-6px 0 18px}.lg i{display:inline-block;width:34px;height:7px;border-radius:4px;vertical-align:middle;margin-right:10px}
.bars{margin-top:44px}.br{margin-bottom:34px}.bl{font-size:30px;margin-bottom:10px}.bl span{color:var(--ink3)}
.bt{display:flex;align-items:center;gap:18px}.bf{height:52px;background:#5a5c61;border-radius:0 10px 10px 0}.bf.k{background:var(--s1)}.bt em{font-style:normal;font-size:34px;font-weight:700}
.take{font-size:34px;line-height:1.4;padding-left:46px;margin:20px 0 0}.take li{margin-bottom:38px;color:var(--ink2)}.take b{color:var(--ink);display:block;margin-bottom:6px}
.meth{font-size:30px;line-height:1.42;color:var(--ink2);padding-left:36px;margin:10px 0 0}.meth li{margin-bottom:22px}
.cta{position:absolute;left:80px;right:80px;bottom:120px;background:var(--card);border-radius:24px;padding:30px 34px;font-size:28px;color:var(--ink2);line-height:1.5}.cta b{color:var(--ink);font-size:36px}
.ft{position:absolute;left:80px;right:80px;bottom:44px;display:flex;justify-content:space-between;font-size:22px;color:var(--ink3);border-top:1px solid var(--line);padding-top:20px}
'''
html = f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{"".join(slides)}</body></html>'
open('carousel.html', 'w').write(html)

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1080, 'height': 1350})
    pg.goto('file://' + os.path.abspath('carousel.html'))
    os.makedirs('linkedin', exist_ok=True)
    for i in range(N):
        pg.locator('.s').nth(i).screenshot(path=f'linkedin/slide-{i+1}.png')
        # overflow check
        o = pg.evaluate(f'''(()=>{{const s=document.querySelectorAll('.s')[{i}];const f=s.querySelector('.ft').getBoundingClientRect().top;
        let m=0;s.querySelectorAll('h1,h2,p,.fig,.bars,ol,ul,.duo,.lg').forEach(e=>{{m=Math.max(m,e.getBoundingClientRect().bottom)}});return [m,f]}})()''')
        print(i + 1, 'content bottom', round(o[0]), 'footer top', round(o[1]))
    pg.pdf(path='linkedin/Kane_Off_the_Curve_carousel.pdf', width='1080px', height='1350px', print_background=True)
    b.close()
print(rows)
