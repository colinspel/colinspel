# Peak Window: Age Curves by Position

**When do footballers peak, and when does the market get it wrong?**

Peak Window is a scouting tool with age curves for every position, built from 7,188 players across Europe's big five leagues.

📄 **Full project:** [Peak_Window.pdf](Peak_Window.pdf)

## Method

I tracked 12,881 year-over-year changes (2017/18–2024/25), weighted by minutes, and chained them into a curve for each position.

1. **Position-specific ratings:** strikers on xG, xAG and shots; centre-backs on aerials, duels and passing; and so on.
2. **Survivorship correction:** players who drop out of the big five stay in the data, so older players don't look better than they are.
3. **Context controls:** adjusts for moving to a stronger or weaker club and for season-wide stat changes.

## Key findings

| Position | Peak age |
|---|---|
| Wingers & AMs | 23 |
| Full-backs | 24 |
| Centre-backs | 27 |
| Central mids | 28 |
| Strikers | Flat, no clear peak |

By 30, a typical winger is 5.7 rating points below his peak; a central midfielder is just 0.2 down.

## How I'd use it in a recruitment meeting

1. **Buy midfielders, centre-backs and strikers at 28–30.** Output is near peak; the price is half.
2. **Sell wingers and full-backs by 26.** They peak earliest and decline fastest.
3. **Price in exit risk after 32.** Barely half of 34-year-old midfielders are still in the big five a year later.

**Data:** FBref / Opta · Transfermarkt via worldfootballR

[← Back to all projects](../README.md)
