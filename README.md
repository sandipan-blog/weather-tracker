# Weather

A station weather page: world map, live cyclones, and a station report with
current conditions, the next 24 hours, and a 3-day outlook.

**Built with [Loop](https://loop.cursor.com)** — written step-by-step from a loop agent prompt (`prompt.md`), not a hand-coded from-scratch app.

## Live demo

**https://game9.vercel.app**

## Run

```bash
cd weather-tracker
cp src/config.example.js src/config.js
# paste your free WeatherAPI.com key into src/config.js
python3 -m http.server 8089
```

Then open http://localhost:8089

## Notes

- Station readings from WeatherAPI arrive about every 10–15 minutes; the page
  checks every 10 minutes.
- Cyclone positions come from GDACS.
- The first visit loads Kolkata; afterwards the last place is remembered in
  `localStorage`.
- `src/config.js` and `key.local.txt` are gitignored — never commit API keys.

## Made with Loop

This project was produced by the **Loop** agent using the steps in `prompt.md`.
