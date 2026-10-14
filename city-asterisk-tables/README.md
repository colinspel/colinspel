# The Asterisk Tables

**Rewriting Manchester City's decade, and pricing their punishment.**

In September 2026 Manchester City were reported to have been found guilty on 114 of the 115 Premier League financial charges, which cover 2009–10 to 2017–18. No sanction has been announced, and City are expected to appeal. This project puts numbers on the two "what ifs" everyone is arguing about.

**Interactive page:** download [`index.html`](index.html) and open it in any browser.

![Deduction curve](images/5-deduction-curve.png)

## 1. 2009–18 rewritten

The final tables for the nine seasons covered by the charges, under three scenarios:

- **Actual:** the real final tables.
- **Points deduction:** a slider (0–60 pts) applied to City every season, then the table is re-sorted.
- **Expunged:** City are removed and every team below them moves up a place.

Key findings:

| Season | City title lost at | New champion |
|---|---|---|
| 2011–12 | −1 pt | Man United |
| 2013–14 | −3 pts | Liverpool |
| 2017–18 | −20 pts | Man United |

## 2. 2026–27 deduction simulator

This section runs a Monte Carlo of the current season: 10,000 simulated finishes from the table after matchweek 6, with City top on 18 points.

| Deduction | Title | Top four | Relegation |
|---|---|---|---|
| 0 | 77% | 100% | 0% |
| −10 | 36% | 95% | 0% |
| −20 | 7% | 67% | 0% |
| −30 | 0% | 20% | 2% |
| −40 | 0% | 1% | 19% |
| −50 | 0% | 0% | 67% |

After the verdict, Betfair priced City's relegation at 9/2 (about 18%). In this model, that price only holds with a deduction of roughly **40 points**.

## Method

- **Team ratings** (`model/fit_ratings.py`): one strength rating per team. Each rating blends current points per game, shrunk toward the league average, with bookmaker win/draw/loss odds for the matchweek‑7 fixtures. The fit is a penalized KL-divergence objective solved with SciPy.
- **Match model:** Davidson (Bradley‑Terry with draws), including a home-advantage term.
- **Simulation:** runs in the browser in JavaScript. Matchweek 7 uses the real fixtures. The remaining 31 games are played against random opponents, home or away at 50/50, and each team is simulated independently.
- **Historical ties:** teams level on points keep their original finishing order. This is an approximation of goal difference.

These are hypothetical scenarios, not predictions of the independent commission's ruling.

## Data sources

- Historical tables: official Premier League final standings, 2009–10 to 2017–18
- 2026–27 table and odds: Sportradar feed, 14 Oct 2026
- Verdict and betting context: The Athletic / The Times via Reuters, Sports Mole, Northeast Times

## Stack

Python (NumPy, SciPy) · vanilla JavaScript · SVG

---
Built by [Colin Spelman](https://www.linkedin.com/in/cspelman)
