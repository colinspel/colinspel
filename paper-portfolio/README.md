# Paper $1K

A month-long hypothetical $1,000 portfolio test (Oct 28 to Nov 27, 2026) benchmarked against SPY. No real money.

**Rules (fixed):** rank nine sector/gold ETFs (XLK, XLE, XLV, XLF, XLI, XLU, XLP, XLY, GLD) by 63-session return; only names closing above their 50-day average are eligible; hold the top 3 at equal weight; re-rank at the Monday close; sell any holding that closes 8% below entry. Fills at official closing prices, fractional shares, no commissions.

- `portfolio.json`: live state, updated by scheduled runs at 9:35am, 3:35pm (planned moves) and 4:20pm ET on trading days.
- `paper-1k-widget.js`: Scriptable widget (small/medium/large) plus a tap-to-open interactive dashboard. Sends an iPhone notification the first time it sees a planned BUY or SELL.

## Install the widget
1. Install Scriptable from the App Store.
2. In Scriptable, tap +, paste `paper-1k-widget.js`, name it `Paper 1K`.
3. Run it once in the app and allow notifications.
4. Long-press the home screen, add a Scriptable widget (medium recommended), edit it, choose the `Paper 1K` script.
