# Decision Value Added (DVA)

**I graded 322,169 football decisions. Not whether the pass arrived, but whether it was the right pass.**

Every passing stat grades the outcome: completion %, progressive passes, expected assists. None of them ask whether the player picked the best option he had. Scouts rate decision-making constantly; almost nobody measures it.

📄 **Full project:** [Decision_Value_Added.pdf](Decision_Value_Added.pdf)

## How it works

1. **Build the menu.** From StatsBomb 360 freeze frames: every visible teammate to feet, every pass into a run, carrying, and shooting.
2. **Value every option** by how much it changes the team's expected goals over the next 10 actions, scored by machine-learning models.
3. **Compare to a typical player.** A choice model learns what an average player picks from the same menu. DVA = value chosen minus value a typical player would choose.

Freeze frames are snapshots, so the model matches players between consecutive frames to estimate runs. About 1 in 5 passes is played into a teammate's run, and 807K "pass into run" options were valued.

## Key findings

- **Choosing and executing are different skills.** Players who pick ambitious targets lower their completion %, which makes completion % a poor proxy for good decisions.
- **What didn't work (yet):** pass vs. carry vs. shoot isn't reliable as a skill measure (reliability 0.26), and only 20 players changed teams in the public data, too few to test whether DVA survives a transfer.

**Data:** StatsBomb Open Data (360 freeze frames)

[← Back to all projects](../README.md)
