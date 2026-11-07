# Model Scoreboard

**My Premier League and NFL prediction models, scored live against the betting market.**

🖥️ **Live page:** [colinspel.github.io/model-scoreboard](https://colinspel.github.io/model-scoreboard/). It works on phone and desktop and pulls live scores every 60 seconds. Source: [`index.html`](index.html).

## The models

| League | Model | Backtest before going live (baseline in brackets) |
|---|---|---|
| Premier League | v5.1: Dixon-Coles, ratings pulled toward last season's | RPS 0.202 on 70 games (1/3 each: 0.225) |
| NFL | Ridge team rating with a 2025 prior | Brier 0.234 on 90 games (coin flip: 0.250) |

The backtests used a uniform baseline (1/3 each, or a coin flip); the live page uses the historical home rates, which are harder to beat.

## Where it stands (as of Nov 7, 2026)

Every pick since Oct 29 was logged before kickoff, with the bookmaker odds at that moment. Lower is better.

| League | Games | Model | Market |
|---|---|---|---|
| Premier League (RPS) | 12 | 0.222 | 0.218 |
| NFL (Brier) | 12 with odds | 0.150 | 0.150 |

Both models are **inside noise of the market**. The 90% bootstrap interval on the gap crosses zero for both: Premier League −0.019 to +0.029, NFL −0.018 to +0.018. Against a naive baseline that always predicts the historical home/draw/away rates, the NFL model is ahead (0.182 vs 0.233 on 15 games, though the interval just crosses zero) and the Premier League model is level (0.222 vs 0.227). The live page updates these numbers as games finish.

## Why the market is the bar

Bookmaker odds price in injuries, lineups and team news. These models only see past results plus a prior from last season. Matching the market is a good result for a results-only model, and beating it consistently would be rare. Twelve games per league can't separate the two either way. With the per-game spread seen so far, detecting a 0.01 gap takes roughly 100 to 180 games, and a gap as small as the current Premier League one (0.004) would take over 1,000.

## How it's scored

- **Premier League:** ranked probability score (RPS) over home, draw and away.
- **NFL:** Brier score on the home side.
- **Market:** bookmaker odds (Sportradar) captured when each pick was logged, normalized so the three (or two) outcomes sum to 100%. Picks without odds count toward the model's record but not toward the market comparison.
- **Gap:** model minus market on games where both exist, with a 90% bootstrap interval (2,000 resamples).

## Pilot (Oct 10 to 21)

An earlier round with older models: Premier League v5, an NFL points rating and an MLB Pythagorean model. Ten Premier League pilot picks were generated on Oct 11 from data before the Oct 10 kickoffs and are marked BACKDATED. The pilot is shown on the page for the record and is not counted in the scores above.

[← Back to all projects](../README.md)
