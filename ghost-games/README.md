# Ghost Games

**Take the fans away and the referee stops favouring the home team.**

For about 13 months in 2020 and 2021, Europe's top five leagues played in empty stadiums. That's the closest football will get to a controlled experiment on what crowds do. I compared 2,234 matches played without crowds against 14,056 played with them (2012-13 to March 2020), controlling for team strength, league and the long-run decline in home advantage.

🖥️ **Read it:** [colinspel.github.io/ghost-games](https://colinspel.github.io/ghost-games/). Interactive and built for a phone. Source: [`index.html`](index.html).

## Findings

| Home edge | With fans | Change without fans | 95% interval |
|---|---|---|---|
| Yellow cards (away minus home) | +0.26 a match | −94% | −130% to −58% |
| Points | +0.46 a match | −63% | −92% to −34% |
| Shots on target | +0.86 a match | −36% | −57% to −14% |

- **The referee effect is the clean result.** Away teams stopped getting booked more than home teams. 61% of that drop came from fewer cards per away foul, which is the referee's discretion. The result holds in every check, including a comparison inside the 2019-20 season alone (same squads before and after the restart).
- **Points fell more than shots explain.** The smaller shooting edge accounts for 29% of the points drop. The other 70% isn't explained by shots or red cards. Finishing, game management, penalties and added time are the obvious suspects.
- **It came back.** The yellow-card edge returned to its pre-COVID level (0.27 a match) once fans were back. The points edge is lower than before, but that is in line with the decline that was already under way.
- **A placebo finds nothing.** Pretending the empty period happened in 2017-18 gives effects of about zero.

## Method

Each outcome is a home-minus-away gap for one match. It's regressed on an empty-stadium indicator, league fixed effects, the pre-match Elo gap (computed without a home term) and a linear season trend, with HC1 standard errors. As checks I also ran team-season clustering, a version with no trend term, dropping windows with capped crowds, the within-2019-20 comparison and the placebo.

I excluded 2021-22 (crowds returned unevenly) and the 2020 suspension window (43 matches) from the main estimates.

## Reproduce it

[`replicate.py`](replicate.py) rebuilds the main regression estimates (the findings table and the shots and home-win figures) from the public data in one command:

```
git clone --depth 1 https://github.com/datasets/football-datasets
python replicate.py football-datasets/datasets
```

It matches the original run within rounding: points −64% (interval −93% to −36%) against −63%, and the card change −0.24 against −0.25 a match. The Elo settings (K = 20, ratings carried across seasons) may differ slightly from the original. The card and points decompositions, the checks table and the referee chart come from the original analysis and aren't in this script yet.

## Limits

- Other things changed in 2020 too: five substitutes, congested fixtures and a summer restart. None of them should make a referee book away players less often than home players, which is why the card result is the strongest one.
- Penalties and added time aren't in this dataset, and they're probably part of the unexplained points drop.
- Referee names are only recorded for the Premier League. That chart covers 12 referees with 15 to 37 empty-stadium games each, so read the pattern across referees, not any single referee.

**Data:** football-data.co.uk match statistics via the [datasets/football-datasets](https://github.com/datasets/football-datasets) mirror. 25,241 matches in total, 2012-13 to 2025-26.

[← Back to all projects](../README.md)
