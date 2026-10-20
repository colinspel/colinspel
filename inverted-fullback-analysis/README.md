# Does the Inverted Fullback Work?

**When a fullback steps inside into midfield instead of staying wide, does the possession get more dangerous, and does the team get exposed?**

An interactive Tableau dashboard built on 11,943 possessions from 198 international tournament matches.

📊 **Interactive dashboard:** [open on Tableau Public](https://public.tableau.com/shared/79K6YH394?:display_count=n&:origin=viz_share_link)

📁 **Workbook:** [Inverted_Fullback_Dashboard.twb](Inverted_Fullback_Dashboard.twb) (Tableau Desktop / Public, 2026.1)

## Headline results

| | Fullback wide | Fullback inside |
|---|---|---|
| Possession ends in a shot | 12% | 18% |
| xG per possession (adjusted) | baseline | **+43%** |
| Opponent shots after a lost ball | baseline | −0.7 percentage points (no clear change) |

Possessions where the fullback receives inside are clearly more dangerous, with no clear defensive cost. This is observational, so read it as a strong association within the same team and match, not proof of cause. The effect points the same way in every tournament.

The five *documented* inverters (fullbacks an analyst described rotating into midfield, e.g. Danilo at WC 2022 and Cancelo at Euro 2024) tell a different story. Comparing their own inside and wide possessions, only "ends in a shot" is clearly lower. The sample is small (52 inside possessions), so read it as a hint: for designed inverters the job is control, not chance creation.

## Method

1. **Label each possession.** Any possession where a fullback touched the ball in the middle third is *inside* if his first touch was in the central channel (y 20–60), otherwise *wide*.
2. **Compare like with like.** Inside possessions are compared only with possessions by the same team in the same match.
3. **Adjust for context.** Score state, half, touch depth and how the possession started.
4. **Honest uncertainty.** 95% confidence intervals clustered by match.

## What's on the dashboard

- **Going inside: effect on the possession.** Estimated inside-minus-wide difference with confidence intervals, for all fullbacks and for the documented inverters
- **Who goes inside most.** Top 20 fullbacks by share of middle-third touches received inside (min. 270 minutes), with pass completion and key passes per 90
- **Touch map.** Click a player to see where he gets the ball
- **Every tournament.** The shot-rate effect split by Euro 2020, World Cup 2022, Euro 2024 and Copa América 2024

**Data:** Hudl StatsBomb open data · **Built in:** Tableau

[← Back to all projects](../README.md)
