# Model Scoreboard

**Three prediction models, scored live against real results.**

A live scoreboard pitting three of my prediction models against each other:

| Sport | Model | Backtested skill |
|---|---|---|
| Soccer (EPL) | FootyRush v5, Dixon-Coles | 13.9% |
| NFL | Points-rating model | 11.0% |
| MLB | Pythagorean model | 2.2% |

🖥️ **Live page:** download [`index.html`](index.html) and open it in Safari or Chrome. It pulls live scores every 60 seconds.

## How it's scored

- Every pick is logged before kickoff.
- **Hit rate:** the model's most likely outcome happened (draws count for soccer).
- **Skill:** how much better the model's probabilities were than a naive home-win-rate guess, using the Brier score (3-way RPS for soccer, as in the backtests).
- Each bar has a marker at the model's backtested skill; filling past it means the model is beating its own track record. Betting-market backtests are shown for comparison.

A handful of games is mostly luck, so read it as a scoreboard, not proof.

[← Back to all projects](../README.md)
