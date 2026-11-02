import { WEATHER_API_KEY } from "./config.js";
import {
  searchUrl,
  currentUrl,
  forecastUrl,
  parseSearch,
  parseCurrent,
  parseForecast,
} from "./weather.js";
import { CYCLONE_URL, parseCyclones, alertColor } from "./cyclones.js";

const REFRESH_MS = 10 * 60 * 1000;
const STORAGE_KEY = "weather.place";

const els = {
  input: document.getElementById("city-input"),
  suggestions: document.getElementById("suggestions"),
  btnLocation: document.getElementById("btn-location"),
  btnRefresh: document.getElementById("btn-refresh"),
  statusLine: document.getElementById("status-line"),
  loading: document.getElementById("loading-text"),
  error: document.getElementById("error-text"),
  currentCard: document.getElementById("current-card"),
  placeName: document.getElementById("place-name"),
  placeRegion: document.getElementById("place-region"),
  conditionIcon: document.getElementById("condition-icon"),
  tempC: document.getElementById("temp-c"),
  conditionText: document.getElementById("condition-text"),
  feelsLike: document.getElementById("feels-like"),
  localTime: document.getElementById("local-time"),
  stationUpdated: document.getElementById("station-updated"),
  checkedAt: document.getElementById("checked-at"),
  statsSection: document.getElementById("stats-section"),
  statsGrid: document.getElementById("stats-grid"),
  hourlySection: document.getElementById("hourly-section"),
  hourlyRow: document.getElementById("hourly-row"),
  dailySection: document.getElementById("daily-section"),
  dailyGrid: document.getElementById("daily-grid"),
  mapSection: document.getElementById("map-section"),
  cyclonesSection: document.getElementById("cyclones-section"),
  cycloneCards: document.getElementById("cyclone-cards"),
};

let lastQuery = null;
let lastGood = null;
let lastForecast = null;
let refreshTimer = null;
let suggestionTimer = null;
let activeIndex = -1;
let currentList = [];

/* ---- map ---- */

const map = L.map("map", {
  center: [20, 10],
  zoom: 2,
  minZoom: 2,
  worldCopyJump: true,
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

let placeMarker = null;

function setPlaceMarker(lat, lon) {
  const icon = L.divIcon({
    className: "gold-marker",
    html: '<span class="gold-dot"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
  if (placeMarker) {
    placeMarker.setLatLng([lat, lon]);
  } else {
    placeMarker = L.marker([lat, lon], { icon, zIndexOffset: 1000 }).addTo(map);
  }
}

let cycloneMarkers = [];

function clearCycloneMarkers() {
  for (const m of cycloneMarkers) map.removeLayer(m);
  cycloneMarkers = [];
}

function renderCyclones(list) {
  els.cycloneCards.innerHTML = "";
  clearCycloneMarkers();

  for (const c of list) {
    const color = alertColor(c.alert);
    const card = document.createElement("div");
    card.className = "cyclone-card";
    card.style.borderColor = color;

    const name = document.createElement("strong");
    name.textContent = c.name || c.title || `Cyclone ${c.id}`;
    name.style.color = color;

    const wind = document.createElement("div");
    wind.textContent = `${Math.round(c.windKph || 0)} km/h wind`;

    const sev = document.createElement("div");
    sev.className = "muted";
    sev.textContent = c.detail || c.title || "";

    card.append(name, wind, sev);
    card.addEventListener("click", () => focusCyclone(c));
    els.cycloneCards.appendChild(card);

    const dot = L.circleMarker([c.latitude, c.longitude], {
      radius: 8,
      color: "#ffffff",
      weight: 2.5,
      fillColor: color,
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip(`${c.name || c.title} · ${Math.round(c.windKph || 0)} km/h`);
    dot.on("click", () => focusCyclone(c));
    cycloneMarkers.push(dot);
  }

  els.cyclonesSection.hidden = list.length === 0;
}

function focusCyclone(c) {
  map.setView([c.latitude, c.longitude], 4);
  loadWeather(`${c.latitude},${c.longitude}`);
}

async function loadCyclones() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(CYCLONE_URL);
      const text = await res.text();
      if (!res.ok || !text.trim().startsWith("{")) throw new Error("cyclone feed");
      renderCyclones(parseCyclones(JSON.parse(text)));
      return;
    } catch (_) {
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
}

map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  loadWeather(`${lat.toFixed(4)},${lng.toFixed(4)}`);
});

function setStatus(text) {
  els.statusLine.textContent = text || "";
}

function showLoading(on) {
  els.loading.hidden = !on;
}

function showError(msg) {
  els.error.textContent = msg || "";
  els.error.hidden = !msg;
}

function savePlace(query, label) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ query, label }));
  } catch (_) {}
}

function loadPlace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.query) return p;
    }
  } catch (_) {}
  return null;
}

function renderCurrent(c) {
  els.currentCard.hidden = false;
  els.placeName.textContent = c.name;
  els.placeRegion.textContent = [c.region, c.country].filter(Boolean).join(", ");
  els.conditionIcon.src = c.icon;
  els.conditionIcon.alt = c.condition;
  els.tempC.textContent = Math.round(c.tempC);
  els.conditionText.textContent = c.condition;
  els.feelsLike.textContent = `Feels like ${Math.round(c.feelsLikeC)}°C`;
  els.localTime.textContent = `${c.localtime} (${c.tz})`;

  const stats = [
    ["Humidity", `${c.humidity}%`],
    ["Wind", `${Math.round(c.windKph)} km/h ${c.windDir}`],
    ["Gust", `${Math.round(c.gustKph)} km/h`],
    ["Rain", `${c.precipMm} mm`],
    ["Pressure", `${Math.round(c.pressureMb)} mb`],
    ["Cloud", `${c.cloud}%`],
    ["Visibility", `${c.visKm} km`],
    ["UV index", `${c.uv}`],
  ];
  els.statsGrid.innerHTML = "";
  for (const [label, value] of stats) {
    const div = document.createElement("div");
    div.className = "stat";
    const l = document.createElement("div");
    l.className = "label";
    l.textContent = label;
    const v = document.createElement("div");
    v.className = "value";
    v.textContent = value;
    div.append(l, v);
    els.statsGrid.appendChild(div);
  }
  els.statsSection.hidden = false;
}

function hourLabel(time) {
  const t = time.split(" ")[1] || time;
  return t.slice(0, 5);
}

function renderHourly(hours) {
  const shown = hours.slice(0, 24);
  els.hourlyRow.innerHTML = "";
  for (const h of shown) {
    const div = document.createElement("div");
    div.className = "hour-cell";
    const t = document.createElement("div");
    t.className = "h-time";
    t.textContent = hourLabel(h.time);
    const img = document.createElement("img");
    img.src = h.icon;
    img.alt = h.condition;
    img.width = 36;
    img.height = 36;
    const temp = document.createElement("div");
    temp.className = "h-temp";
    temp.textContent = `${Math.round(h.tempC)}°`;
    const rain = document.createElement("div");
    rain.className = "h-rain";
    rain.textContent = `${h.chanceOfRain ?? 0}%`;
    div.append(t, img, temp, rain);
    els.hourlyRow.appendChild(div);
  }
  els.hourlySection.hidden = shown.length === 0;
}

function dayLabel(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

function renderDaily(days) {
  els.dailyGrid.innerHTML = "";
  for (const day of days) {
    const card = document.createElement("div");
    card.className = "day-card";

    const head = document.createElement("div");
    head.className = "d-head";
    const label = document.createElement("strong");
    label.textContent = dayLabel(day.date);
    head.appendChild(label);

    const cond = document.createElement("div");
    cond.className = "d-cond";
    const img = document.createElement("img");
    img.src = day.icon;
    img.alt = day.condition;
    img.width = 32;
    img.height = 32;
    const condText = document.createElement("span");
    condText.textContent = day.condition;
    cond.append(img, condText);

    const temps = document.createElement("div");
    temps.className = "d-temps";
    const hi = document.createElement("span");
    hi.className = "d-hi";
    hi.textContent = `${Math.round(day.maxC)}°`;
    const lo = document.createElement("span");
    lo.className = "d-lo";
    lo.textContent = `${Math.round(day.minC)}°`;
    temps.append(hi, lo);

    const bar = document.createElement("div");
    bar.className = "d-bar";
    bar.innerHTML = `<span class="d-bar-fill"></span>`;

    const meta = document.createElement("div");
    meta.className = "d-meta";
    const rainChance = document.createElement("span");
    rainChance.textContent = `Rain ${day.chanceOfRain ?? 0}%`;
    const rainMm = document.createElement("span");
    rainMm.textContent = `${day.precipMm ?? 0} mm`;
    const sun = document.createElement("span");
    sun.textContent = `↑ ${day.sunrise || ""} · ↓ ${day.sunset || ""}`;
    meta.append(rainChance, rainMm, sun);

    card.append(head, cond, temps, bar, meta);
    els.dailyGrid.appendChild(card);
  }
  els.dailySection.hidden = days.length === 0;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadWeather(query, { remember = true, zoomTo = false } = {}) {
  lastQuery = query;
  showLoading(true);
  showError("");
  setStatus("");
  try {
    const data = await fetchJson(currentUrl(WEATHER_API_KEY, query));
    const c = parseCurrent(data);
    lastGood = c;
    renderCurrent(c);
    setPlaceMarker(c.latitude, c.longitude);
    if (zoomTo) map.setView([c.latitude, c.longitude], 10);
    try {
      const fdata = await fetchJson(forecastUrl(WEATHER_API_KEY, query));
      const { hours, days } = parseForecast(fdata);
      lastForecast = { hours, days };
      renderHourly(hours);
      renderDaily(days);
    } catch (_) {
      if (lastForecast) {
        renderHourly(lastForecast.hours);
        renderDaily(lastForecast.days);
      }
    }
    els.stationUpdated.textContent = `Station updated ${c.updatedAt}`;
    els.checkedAt.textContent = `Checked at ${new Date().toLocaleString()}`;
    if (remember) {
      savePlace(query, [c.name, c.region, c.country].filter(Boolean).join(", "));
      els.input.value = c.name;
    }
    document.body.classList.toggle("night", c.isDay === 0);
  } catch (err) {
    if (lastGood) {
      showError("Could not refresh. Showing the last good reading.");
    } else {
      showError(`Could not load weather: ${err.message}`);
    }
  } finally {
    showLoading(false);
    scheduleRefresh();
  }
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    if (lastQuery) loadWeather(lastQuery, { remember: false });
    loadCyclones();
  }, REFRESH_MS);
}

/* ---- search with suggestions ---- */

function hideSuggestions() {
  els.suggestions.hidden = true;
  els.suggestions.innerHTML = "";
  activeIndex = -1;
}

function renderSuggestions(list) {
  currentList = list;
  els.suggestions.innerHTML = "";
  if (!list.length) {
    hideSuggestions();
    return;
  }
  list.forEach((p, i) => {
    const li = document.createElement("li");
    li.dataset.index = i;
    const main = document.createElement("div");
    main.className = "s-main";
    main.textContent = p.name;
    const sub = document.createElement("div");
    sub.className = "s-sub";
    sub.textContent = [p.region, p.country].filter(Boolean).join(", ");
    li.append(main, sub);
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      pickSuggestion(i, list);
    });
    els.suggestions.appendChild(li);
  });
  activeIndex = -1;
  els.suggestions.hidden = false;
}

function pickSuggestion(i, list) {
  const p = list[i];
  hideSuggestions();
  els.input.value = p.name;
  loadWeather(`${p.lat},${p.lon}`, { remember: true, zoomTo: true });
}

async function requestSuggestions(q) {
  try {
    const data = await fetchJson(searchUrl(WEATHER_API_KEY, q));
    renderSuggestions(parseSearch(data));
  } catch (_) {
    hideSuggestions();
  }
}

els.input.addEventListener("input", () => {
  const q = els.input.value.trim();
  if (suggestionTimer) clearTimeout(suggestionTimer);
  if (q.length < 2) {
    hideSuggestions();
    return;
  }
  suggestionTimer = setTimeout(() => requestSuggestions(q), 250);
});

els.input.addEventListener("keydown", (e) => {
  const items = [...els.suggestions.querySelectorAll("li")];
  if (e.key === "Enter") {
    e.preventDefault();
    if (!els.suggestions.hidden && items.length && activeIndex >= 0) {
      pickSuggestion(activeIndex, currentList);
    } else {
      const q = els.input.value.trim();
      if (q) {
        hideSuggestions();
        loadWeather(q, { zoomTo: true });
      }
    }
  } else if (e.key === "ArrowDown" && items.length) {
    e.preventDefault();
    activeIndex = (activeIndex + 1) % items.length;
    items.forEach((li, i) => li.classList.toggle("active", i === activeIndex));
  } else if (e.key === "ArrowUp" && items.length) {
    e.preventDefault();
    activeIndex = (activeIndex - 1 + items.length) % items.length;
    activeIndex = activeIndex < 0 ? items.length - 1 : activeIndex;
    items.forEach((li, i) => li.classList.toggle("active", i === activeIndex));
  } else if (e.key === "Escape") {
    hideSuggestions();
  }
});

document.addEventListener("click", (e) => {
  if (!els.suggestions.contains(e.target) && e.target !== els.input) {
    hideSuggestions();
  }
});

/* ---- buttons ---- */

els.btnRefresh.addEventListener("click", () => {
  if (lastQuery) loadWeather(lastQuery, { remember: false });
  loadCyclones();
});

els.btnLocation.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation is not available in this browser.");
    return;
  }
  setStatus("Finding your location…");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setStatus("");
      loadWeather(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`, { zoomTo: true });
    },
    () => {
      setStatus("");
      showError("Could not get your location.");
    }
  );
});

/* ---- init ---- */

const saved = loadPlace();
if (saved) {
  els.input.value = saved.label || saved.query;
  loadWeather(saved.query, { remember: false, zoomTo: true });
} else {
  loadWeather("Kolkata", { zoomTo: true });
}
loadCyclones();
