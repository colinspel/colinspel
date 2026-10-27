"""Profile-specific striker aging curves (delta method), Big 5 leagues, FBref via worldfootballR_data."""
import json
import numpy as np
import pandas as pd

D = 'data/'
MIN_MIN = 900
rng = np.random.default_rng(7)

s = pd.read_pickle(D + 'standard.pkl')
p = pd.read_pickle(D + 'possession.pkl')
s = s[s.Season_End_Year <= 2025]  # 2025-26 table in the source is an early-season snapshot
p = p[p.Season_End_Year <= 2025]
s['pid'] = s.Url.str.extract(r'/players/([0-9a-f]{8})/')[0]
p['pid'] = p.Url.str.extract(r'/players/([0-9a-f]{8})/')[0]
s['age'] = s.Age.astype(str).str.split('-').str[0].replace({'': np.nan, 'nan': np.nan, 'None': np.nan}).astype(float)

# forwards: listed FW as first position in at least one season
s['fw'] = s.Pos.fillna('').str.startswith('FW')

# aggregate across clubs within a season
agg = s.groupby(['pid', 'Season_End_Year']).agg(
    player=('Player', 'first'), age=('age', 'min'), born=('Born', 'first'), fw=('fw', 'max'),
    mins=('Min_Playing', 'sum'), gls=('Gls', 'sum'), pk=('PK', 'sum'), ast=('Ast', 'sum')).reset_index()
agg['npg'] = agg.gls - agg.pk
agg['npg90'] = agg.npg / agg.mins * 90
fw_ids = agg.groupby('pid').fw.mean()
fw_ids = fw_ids[fw_ids >= 0.5].index  # forward in majority of seasons
F = agg[agg.pid.isin(fw_ids) & (agg.mins >= MIN_MIN) & agg.age.notna()].copy()

# ---- style profile from possession data, ages <= 29 only (so aging does not leak into the label) ----
pa = p.groupby(['pid', 'Season_End_Year']).agg(
    m90=('Mins_Per_90', 'sum'), tko=('Att_Take', 'sum'), prgc=('PrgC_Carries', 'sum'),
    cpa=('CPA_Carries', 'sum'), boxt=('Att Pen_Touches', 'sum'), tch=('Touches_Touches', 'sum')).reset_index()
pa = pa.merge(agg[['pid', 'Season_End_Year', 'age']], on=['pid', 'Season_End_Year'])
pa = pa[pa.pid.isin(fw_ids) & (pa.m90 >= 10) & (pa.age <= 29)]
prof = pa.groupby('pid')[['m90', 'tko', 'prgc', 'cpa']].sum()
prof = prof[prof.m90 >= 15]
prof['take90'] = prof.tko / prof.m90
prof['prgc90'] = prof.prgc / prof.m90
prof['cpa90'] = prof.cpa / prof.m90
z = lambda x: (x - x.mean()) / x.std()
prof['carry_score'] = (z(prof.take90) + z(prof.prgc90) + z(prof.cpa90)) / 3
med = prof.carry_score.median()
prof['profile'] = np.where(prof.carry_score >= med, 'Carrier', 'Finisher')
F = F.merge(prof[['profile', 'carry_score']], left_on='pid', right_index=True, how='left')

# ---- delta method ----
def pairs(df):
    df = df.sort_values(['pid', 'Season_End_Year'])
    nxt = df.groupby('pid').shift(-1)
    ok = (nxt.Season_End_Year == df.Season_End_Year + 1)
    out = pd.DataFrame({'pid': df.pid, 'age': df.age, 'd': nxt.npg90 - df.npg90,
                        'w': 2 / (1 / df.mins + 1 / nxt.mins), 'profile': df.profile})[ok]
    return out.dropna(subset=['d'])

P = pairs(F)
AGES = list(range(20, 35))  # transition age -> age+1


def curve(pp, base=27):
    pts = {}
    for a in AGES:
        g = pp[pp.age == a]
        pts[a] = (np.average(g.d, weights=g.w) if len(g) >= 15 else np.nan, len(g))
    lvl = {AGES[0]: 0.0}
    for a in AGES:
        lvl[a + 1] = lvl[a] + (pts[a][0] if not np.isnan(pts[a][0]) else np.nan)
    b = lvl[base]
    return {a: v - b for a, v in lvl.items()}, {a: n for a, (_, n) in pts.items()}


def boot(pp, B=400, base=27):
    ids = pp.pid.unique(); out = []
    groups = {k: g for k, g in pp.groupby('pid')}
    for _ in range(B):
        samp = pd.concat([groups[i] for i in rng.choice(ids, len(ids))])
        out.append(curve(samp, base)[0])
    df = pd.DataFrame(out)
    return df.quantile(0.1).to_dict(), df.quantile(0.9).to_dict()

res = {}
for name, pp in [('All forwards', P), ('Carrier', P[P.profile == 'Carrier']), ('Finisher', P[P.profile == 'Finisher'])]:
    c, n = curve(pp)
    lo, hi = boot(pp)
    res[name] = {'curve': c, 'n': n, 'lo': lo, 'hi': hi, 'players': int(pp.pid.nunique()), 'pairs': int(len(pp))}

# peak age per curve
for k, v in res.items():
    c = {a: x for a, x in v['curve'].items() if not np.isnan(x)}
    v['peak'] = max(c, key=c.get)

# drop from 27 to 31/32
summary = {k: {'peak': v['peak'], 'd27_31': v['curve'].get(31), 'd27_32': v['curve'].get(32),
               'players': v['players'], 'pairs': v['pairs']} for k, v in res.items()}

# ---- Kane ----
kane_id = s[s.Player == 'Harry Kane'].pid.iloc[0]
kane = agg[agg.pid == kane_id][['Season_End_Year', 'age', 'mins', 'npg', 'npg90', 'pk']].copy()
kane = kane[kane.mins >= 900]
# 2025-26 Bundesliga added from external sources (not in FBref snapshot): 36 G, 10 PK, 2377 min
kane = pd.concat([kane, pd.DataFrame([{'Season_End_Year': 2026, 'age': 32, 'mins': 2377, 'npg': 26, 'pk': 10,
                                        'npg90': 26 / 2377 * 90}])], ignore_index=True)
kane_profile = prof.loc[kane_id] if kane_id in prof.index else None
kane_pct = float((prof.carry_score < kane_profile.carry_score).mean() * 100) if kane_profile is not None else None

# Kane's prime baseline: ages 24-28 minutes-weighted npG/90
kp = kane[(kane.age >= 24) & (kane.age <= 28)]
kane_base = float(kp.npg.sum() / kp.mins.sum() * 90)
kane['vs_prime'] = kane.npg90 - kane_base

# percentile of Kane's age-30/31/32 season among all forward seasons at 30+ (900+ min)
older = F[F.age >= 30]
pct = {int(r.age): float((older.npg90 < r.npg90).mean() * 100) for r in kane[kane.age >= 30].itertuples()}

# projected Kane path if he aged like each curve, from his prime base
proj = {k: {a: kane_base + res[k]['curve'][a] for a in range(24, 34) if not np.isnan(res[k]['curve'][a])}
        for k in res}

# comparable "Finisher" forwards who kept 0.5+ npG/90 at 31+
keepers = F[(F.age >= 31) & (F.npg90 >= 0.5) & (F.mins >= 1500)].groupby(['player', 'profile']).agg(
    seasons=('npg90', 'size'), best=('npg90', 'max')).reset_index().sort_values('best', ascending=False)

# carrier group players aged 31+: how many seasons with 900+ (survival)
surv = F[F.age >= 31].groupby('profile').pid.nunique().to_dict()
base_pool = F[(F.age >= 24) & (F.age <= 27)].groupby('profile').pid.nunique().to_dict()

out = {
    'res': {k: {kk: ({str(a): (None if (isinstance(x, float) and np.isnan(x)) else x) for a, x in vv.items()}
                     if isinstance(vv, dict) else vv) for kk, vv in v.items()} for k, v in res.items()},
    'summary': summary,
    'kane': kane.round(3).to_dict('records'), 'kane_base': kane_base,
    'kane_profile': None if kane_profile is None else {k: float(v) for k, v in kane_profile.items() if k != 'profile'},
    'kane_label': None if kane_profile is None else kane_profile['profile'], 'kane_carry_pct': kane_pct,
    'kane_pct_older': pct,
    'proj': {k: {str(a): x for a, x in v.items()} for k, v in proj.items()},
    'n_prof': prof.profile.value_counts().to_dict(),
    'surv31': surv, 'pool24_27': base_pool,
    'n_forward_seasons': int(len(F)), 'n_forwards': int(F.pid.nunique()),
    'seasons': [int(F.Season_End_Year.min()), int(F.Season_End_Year.max())],
    'keepers': keepers.head(15).to_dict('records'),
    'profile_means': prof.groupby('profile')[['take90', 'prgc90', 'cpa90']].mean().round(2).to_dict('index'),
}
json.dump(out, open('results.json', 'w'), indent=1, default=float)
print(json.dumps({k: out[k] for k in ['summary', 'kane_base', 'kane_profile', 'kane_label', 'kane_carry_pct', 'kane_pct_older',
                                      'n_prof', 'surv31', 'pool24_27', 'n_forward_seasons', 'n_forwards', 'seasons', 'profile_means']},
                 indent=1, default=float))
print(kane.round(2).to_string())
for k in res: print(k, {a: (round(res[k]['curve'][a], 3), res[k]['n'].get(a)) for a in range(22, 35)})
print(keepers.head(15).to_string())
