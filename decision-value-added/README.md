# Decision Value Added (DVA)

**I graded 322,169 football decisions. Not whether the pass arrived, but whether it was the right pass.**

Every passing stat grades the outcome: completion %, progressive passes, expected assists. None of them ask whether the player picked the best option he had. Scouts rate decision-making constantly; almost nobody measures it.

📄 **Full project:** [Decision_Value_Added.pdf](Decision_Value_Added.pdf)

## How it works

1. **Build the menu.** From StatsBomb 360 freeze frames: every visible teammate to feet, every pass into a run, carrying, and shooting.
2. **Value every option** by how much it changes the team's expected goals over the next 10 actions, scored by machine-learning models.
3. **Compare to a typical player.** A choice model learns what an average player picks from the same menu. DVA = value chosen minus value a typical player would choose.

Freeze frames are snapshots, so the model matches players between consecutive frames to estimate runs. About 1 in 5 passes is played into a teammate's run, and 807K "pass into run" options were valued.

## Is it a real skill?

- **Split-half reliability 0.64.** Split each player's matches in half: his passing DVA in one half predicts the other. Pure noise would score 0.
- **Rank agreement 0.97** when players are re-rated using only options inside the camera view, so teammates and defenders the freeze frame can't see aren't driving the ratings.
- Every value and choice model is scored on matches it never trained on.

## Key findings

- **Choosing and executing are different skills.** Players who pick ambitious targets lower their completion %, which makes completion % a poor proxy for good decisions.
- **What didn't work (yet):** the passing rating holds up (0.64 above), but the separate choice between passing, carrying and shooting doesn't yet behave like a stable skill (reliability 0.26), so no ratings are published for it, and only 20 players changed teams in the public data, too few to test whether DVA survives a transfer.

**Data:** StatsBomb Open Data (360 freeze frames)

[← Back to all projects](../README.md)
