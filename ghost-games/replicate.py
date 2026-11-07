"""Ghost Games: reproduce the headline estimates from public data.

Data: football-data.co.uk match files, mirrored at github.com/datasets/football-datasets
  git clone --depth 1 https://github.com/datasets/football-datasets
  python replicate.py football-datasets/datasets

Each outcome is a home-minus-away gap for one match, regressed on an empty-stadium
indicator, league fixed effects, the pre-match Elo gap (no home term) and a linear
season trend, with HC1 standard errors. Sample: 2012-13 to 2020-21; the 2020
suspension window (43 matches) and 2021-22 (uneven crowd returns) are excluded.
"""
import sys
import numpy as np
import pandas as pd

LEAGUES = {"premier-league": "EPL", "la-liga": "ESP", "serie-a": "ITA", "bundesliga": "GER", "ligue-1": "FRA"}
SEASONS = ["1213", "1314", "1415", "1516", "1617", "1718", "1819", "1920", "2021", "2122", "2223", "2324", "2425", "2526"]
RESTART = {"GER": "2020-05-16", "ESP": "2020-06-11", "ITA": "2020-06-20", "EPL": "2020-06-17"}  # Ligue 1 never restarted


def load(root):
    frames = []
    for folder, code in LEAGUES.items():
        for s in SEASONS:
            d = pd.read_csv(f"{root}/{folder}/season-{s}.csv")
            d["lg"], d["season"] = code, int("20" + s[:2])
            frames.append(d)
    df = pd.concat(frames, ignore_index=True)
    df["Date"] = pd.to_datetime(df["Date"])
    return df.sort_values("Date", kind="stable").reset_index(drop=True)


def label_periods(df):
    df["no_fans"], df["excl"] = 0, 0
    s19 = df.season == 2019
    for lg, day in RESTART.items():
        df.loc[s19 & (df.lg == lg) & (df.Date >= day), "no_fans"] = 1
    df.loc[s19 & (df.no_fans == 0) & (df.Date >= "2020-03-07"), "excl"] = 1
    df.loc[df.season == 2020, "no_fans"] = 1
    df.loc[df.season == 2021, "excl"] = 1
    return df


def elo_gap(df, k=20):
    rating, gap = {}, []
    for h, a, r in zip(df.HomeTeam, df.AwayTeam, df.FTR):
        rh, ra = rating.get(h, 1500), rating.get(a, 1500)
        gap.append(rh - ra)
        expected = 1 / (1 + 10 ** ((ra - rh) / 400))
        score = {"H": 1, "D": 0.5, "A": 0}[r]
        rating[h], rating[a] = rh + k * (score - expected), ra - k * (score - expected)
    return np.array(gap) / 100


def outcomes(df):
    home_pts = df.FTR.map({"H": 3, "D": 1, "A": 0})
    away_pts = df.FTR.map({"H": 0, "D": 1, "A": 3})
    return {
        "Points edge": home_pts - away_pts,
        "Goal edge": df.FTHG - df.FTAG,
        "Shot edge": df.HS - df.AS,
        "Shots-on-target edge": df.HST - df.AST,
        "Home win rate": (df.FTR == "H").astype(float),
        "Yellow-card edge (away minus home)": df.AY - df.HY,
        "Foul edge (away minus home)": df.AF - df.HF,
    }


def ols_hc1(X, y):
    b = np.linalg.lstsq(X, y, rcond=None)[0]
    e = y - X @ b
    n, k = X.shape
    inv = np.linalg.inv(X.T @ X)
    V = inv @ (X.T * e**2) @ X @ inv * n / (n - k)
    return b, np.sqrt(np.diag(V))


def main(root):
    df = label_periods(load(root))
    df["elo"] = elo_gap(df)
    m = df[(df.season <= 2020) & (df.excl == 0)].copy()
    print(f"Sample: {len(m):,} matches ({int(m.no_fans.sum()):,} without crowds, {int((m.no_fans == 0).sum()):,} with)\n")
    m["t"] = m.season - 2012
    dummies = [(m.lg == g).astype(float) for g in ["ESP", "ITA", "GER", "FRA"]]
    X = np.column_stack([np.ones(len(m)), m.no_fans, m.elo, m.t] + dummies)
    for name, y in outcomes(m).items():
        ok = y.notna().values
        b, se = ols_hc1(X[ok], y.values[ok].astype(float))
        e = ok & (m.no_fans.values == 1)
        crowd_level = (np.column_stack([np.ones(e.sum()), np.zeros(e.sum())] + [c[e] for c in X[:, 2:].T]) @ b).mean()
        lo, hi = b[1] - 1.96 * se[1], b[1] + 1.96 * se[1]
        print(f"{name:36s} with fans {crowd_level:+.2f}  change {b[1]:+.2f} [{lo:+.2f}, {hi:+.2f}]  ({b[1] / crowd_level:+.0%})")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "football-datasets/datasets")
