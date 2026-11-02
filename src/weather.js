export const CYCLONE_URL_PLACEHOLDER = null;

function base(key) {
  if (!key) throw new Error("WeatherAPI key is empty");
  return `https://api.weatherapi.com/v1`;
}

export function searchUrl(key, q) {
  return `${base(key)}/search.json?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}`;
}

export function currentUrl(key, q) {
  return `${base(key)}/current.json?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&aqi=no`;
}

export function forecastUrl(key, q) {
  return `${base(key)}/forecast.json?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&days=3&aqi=no&alerts=no`;
}

export function parseSearch(data) {
  if (!Array.isArray(data)) return [];
  return data.map((p) => ({
    name: p.name,
    region: p.region || "",
    country: p.country || "",
    lat: p.lat,
    lon: p.lon,
    url: p.url,
  }));
}

function iconUrl(icon) {
  if (typeof icon === "string" && icon.startsWith("//")) return `https:${icon}`;
  return icon;
}

export function parseCurrent(data) {
  const loc = data.location || {};
  const cur = data.current || {};
  return {
    name: loc.name,
    region: loc.region || "",
    country: loc.country || "",
    latitude: loc.lat,
    longitude: loc.lon,
    localtime: loc.localtime,
    tz: loc.tz_id,
    tempC: cur.temp_c,
    feelsLikeC: cur.feelslike_c,
    condition: (cur.condition && cur.condition.text) || "",
    icon: iconUrl(cur.condition && cur.condition.icon),
    humidity: cur.humidity,
    windKph: cur.wind_kph,
    windDir: cur.wind_dir,
    windDegree: cur.wind_degree,
    gustKph: cur.gust_kph,
    precipMm: cur.precip_mm,
    pressureMb: cur.pressure_mb,
    cloud: cur.cloud,
    visKm: cur.vis_km,
    uv: cur.uv,
    isDay: cur.is_day,
    updatedAt: cur.last_updated,
  };
}

export function parseForecast(data) {
  const loc = data.location || {};
  const fc = data.forecast || {};
  const days = Array.isArray(fc.forecastday) ? fc.forecastday : [];

  const hours = [];
  for (const d of days) {
    const dayHours = Array.isArray(d.hour) ? d.hour : [];
    for (const h of dayHours) {
      if (h.time < loc.localtime) continue;
      hours.push({
        time: h.time,
        epoch: h.time_epoch,
        tempC: h.temp_c,
        condition: (h.condition && h.condition.text) || "",
        icon: iconUrl(h.condition && h.condition.icon),
        chanceOfRain: h.chanceofrain,
        precipMm: h.precip_mm,
      });
    }
  }

  const outDays = days.slice(0, 3).map((d) => ({
    date: d.date,
    condition: (d.day && d.day.condition && d.day.condition.text) || "",
    icon: iconUrl(d.day && d.day.condition && d.day.condition.icon),
    maxC: d.day && d.day.maxtemp_c,
    minC: d.day && d.day.mintemp_c,
    chanceOfRain: d.day && d.day.daily_chance_of_rain,
    precipMm: d.day && d.day.totalprecip_mm,
    sunrise: d.astro && d.astro.sunrise,
    sunset: d.astro && d.astro.sunset,
  }));

  return { hours, days: outDays };
}
