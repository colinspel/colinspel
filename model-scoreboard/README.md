# Model Scoreboard

**Three prediction models, scored live against real results.**

A live scoreboard pitting three of my prediction models against each other:

| Sport | Model | Backtested skill |
|---|---|---|
| Soccer (EPL) | FootyRush v5, Dixon-Coles | 13.9% |
| NFL | Points-rating model | 11.0% |
| MLB | Pythagorean model | 2.2% |

🖥️ **Live page:** [colinspel.github.io/model-scoreboard](https://colinspel.github.io/model-scoreboard/) — works on phone and desktop and pulls live scores every 60 seconds. Source: [`index.html`](index.html).

## How it's scored

- Picks are logged before kickoff, except 10 EPL picks from 10 to 12 Oct. Those were generated on 11 Oct using only data from before the 10 Oct kickoffs and are marked BACKDATED on the page.
- **Hit rate:** the model's most likely outcome happened (draws count for soccer).
- **Skill:** how much better the model's probabilities were than a naive home-win-rate guess, using the Brier score (3-way RPS for soccer, as in the backtests).
- Each bar has a marker at the model's backtested skill; filling past it means the model is beating its own track record. Betting-market backtests are shown for comparison.

A handful of games is mostly luck, so read it as a scoreboard, not proof.

[← Back to all projects](../README.md)
