# Weather app: step-by-step prompt for the loop agent

## How to run this with loop (for the human)
Send these messages ONE AT A TIME. Wait until the loop window says ready before the next one.

1. `Read weather-tracker/prompt.md. Do not plan or analyse. Do STEP 1 only.`
2. `Do STEP 2 only. Write the files now.`
3. `Do STEP 3 only. Write the files now.`
4. `Do STEP 4 only. Write the files now.`

Do only the STEP named in the message. Stop when that step's check passes. Do not start the next step.

Build the same weather app as `weather-cursor`, in a new folder. It is not a driving game and not a cartoon scene. Read `weather-cursor` as the reference and reproduce its behavior. Write new files. Do not import from `weather-cursor`.

The page has a world map, live cyclones on that map, and a station report underneath: current conditions, the next 24 hours, and 3 days.

## 1. Rules (mandatory)
- ALL new files go inside `/Users/sandipanray/loop/gaming_hackathon/weather/`. You may read `weather-cursor` for reference. Never write, edit, or delete anything in `weather-cursor` or anywhere else. Never touch `echoloop`, `turbo-kart`, `turbo-kart-2`, `snakes-and-ladders`, `live-earth-tracker`, `rangeela-salon-radio`, `bharat-truck-simulator`, or any prompt file. Do not edit or delete `weather/weather-tracker/prompt.md`, `weather/key.local.txt`, or `weather/.gitignore`.
- Never run `pkill`. Never stop a process on port 8080, 8085, 8086, 8087, 8088, or 8094. `weather-cursor` stays on port 8088. This app is served only on port **8089**.
- Write files to disk right away. No long planning. Keep replies short. Report only check results and errors.
- Do ONLY the STEP the human names. Finish its check, then stop.
- Never claim a test passed unless you ran it.
- The WeatherAPI key is the single line in `weather/key.local.txt`. Read that file when you need the key. Never print the key, never paste it into a reply, and never put it in `weather-tracker/prompt.md`, `README.md`, or a test file. Put it only in `src/config.js` as `export const WEATHER_API_KEY = "<the line from key.local.txt>"`.
- WeatherAPI endpoints, with that key:
  - Search: `https://api.weatherapi.com/v1/search.json?key={key}&q={city}`
  - Current: `https://api.weatherapi.com/v1/current.json?key={key}&q={query}&aqi=no`
  - Forecast, 3 days: `https://api.weatherapi.com/v1/forecast.json?key={key}&q={query}&days=3&aqi=no&alerts=no`
  - `{query}` is a city name, or `lat,lon`.
- Cyclones come from GDACS, no key: `https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtype=TC`

## 2. Tech (fixed)
- Plain HTML, CSS, and ES modules. No React, no build step, no npm. Serve with `python3 -m http.server 8089` from `weather/`.
- Leaflet 1.9.4 from `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` and `leaflet.js`, loaded before the module. Map tiles: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution `© OpenStreetMap`. Start at `[20, 10]`, zoom 2, `minZoom` 2, `worldCopyJump` true. Map height 440px.
- `src/weather.js` and `src/cyclones.js` must not touch the DOM, must not fetch, and must not contain the API key, so `node --test tests/*.test.js` can import them.
- Files: `index.html`, `styles.css`, `src/config.js`, `src/main.js`, `src/weather.js`, `src/cyclones.js`, `tests/weather.test.js`, `tests/cyclones.test.js`, `README.md`.

## 3. What the page shows
Same layout as `weather-cursor`:
- Header: eyebrow "Station weather", title "Weather", city search with suggestion list (name, region, country), buttons "Use my location" and "Refresh".
- A world map. Clicking the map loads weather for that latitude,longitude. A gold circle marks the selected place. Do not jump the zoom when a city loads; only move that gold marker. Clicking a cyclone zooms to 4 on that storm and loads its weather.
- Under the map, one card per active cyclone: name, alert color (Red `#c44732`, Orange `#e0a15a`, otherwise `#2f6f4e`), wind km/h, and the GDACS severity text. Sort by wind, strongest first. White ring on the map dot.
- Under that, the report: place, region, country, local time and timezone, condition icon, temperature °C, feels-like, "Station updated" from `current.last_updated`, "Checked at" for the last successful fetch.
- "Right now" grid: humidity, wind with direction, gust, rain mm, pressure mb, cloud, visibility km, UV index.
- "Next 24 hours": a sideways row of hours still ahead of `location.localtime`, each with time, icon, temperature, and rain chance. Cap at 24.
- "Three days": weekday and date, condition, icon, high and low, a high-low bar, rain chance, rainfall mm, sunrise and sunset.
- First visit with nothing saved loads `Kolkata`. Remember the last place in `localStorage`. On load, fetch weather and cyclones immediately, then again every 10 minutes. A failed fetch keeps the last good reading and shows a short error. Do not invent numbers.
- Metric units. Readable on a phone and a desktop window. Light cards, not a game canvas, not three.js.
- Night: if `current.is_day` is 0, add class `night` on `body`.

## 4. Parsers
`src/weather.js`: `searchUrl`, `currentUrl`, `forecastUrl` throw if the key is empty. `parseSearch` returns `[]` for a non-array. `parseCurrent` returns name, region, country, latitude, longitude, localtime, tz, tempC, feelsLikeC, condition, icon (prefix `https:` when the icon starts with `//`), humidity, windKph, windDir, windDegree, gustKph, precipMm, pressureMb, cloud, visKm, uv, isDay, updatedAt. `parseForecast` returns `{ hours, days }`. Hours skip times before `location.localtime`. Days are the `forecastday` entries, up to 3, with date, condition, icon, maxC, minC, chanceOfRain, precipMm, sunrise, sunset.

`src/cyclones.js`: `CYCLONE_URL` is the GDACS URL above. `parseCyclones` reads a GeoJSON FeatureCollection. Keep only `eventtype` `TC` and `Point` geometries. Coordinates are `[lon, lat]`. For each `eventid`, keep the feature with the highest `episodeid`. Return `{ id, episode, name, title, alert, windKph, detail, latitude, longitude, updated }`, sorted by `windKph` descending. Empty or null input returns `[]`.

## 5. STEPs

### STEP 1 — data layer
Write `src/weather.js`, `src/cyclones.js`, `tests/weather.test.js`, and `tests/cyclones.test.js`. Tests use fixture objects and the fake key `test-key`, never the real key. Cover a rainy current report, a clear current report, search, forecast hours that are still ahead, and two cyclone episodes where only the later episode is kept.
Check: `node --test tests/*.test.js` passes. Then stop.

### STEP 2 — live current screen
Read `key.local.txt` and write `src/config.js`. Write `index.html`, `styles.css`, and `src/main.js` far enough to search a city and show the current card, the "Right now" stats, loading text, and the API error text. Enter submits search. Suggestions appear after two characters. Remember the place and fetch it again every 10 minutes. Show "Station updated" and "Checked at". No hourly, daily, map, or cyclone section yet.
Check: `node --test tests/*.test.js` still passes. Start `python3 -m http.server 8089` from `weather/` only if port 8089 is free. Then stop. Do not pkill anything. Do not print the key.

### STEP 3 — hours and 3 days
Add "Next 24 hours" and "Three days" under the current card. Reuse `parseForecast`. The 10-minute refresh updates these too. Tests still pass. Then stop.

### STEP 4 — world map, cyclones, location
Add the Leaflet world map, the gold place marker, map click, the cyclone dots and the cyclone cards, "Use my location", and the Refresh button. Restore the saved place on load, otherwise Kolkata. Cyclones refresh on the same 10-minute timer. Write `README.md`: `cd weather && python3 -m http.server 8089`, then http://localhost:8089 . Say station readings arrive about every 10–15 minutes, the page checks every 10 minutes, and cyclone positions come from GDACS. Do not put the API key in the README. Tests still pass. Then stop.
