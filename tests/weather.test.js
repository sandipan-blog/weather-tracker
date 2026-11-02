import { test } from "node:test";
import assert from "node:assert/strict";

import {
  searchUrl,
  currentUrl,
  forecastUrl,
  parseSearch,
  parseCurrent,
  parseForecast,
} from "../src/weather.js";

const KEY = "test-key";

function rainyCurrent() {
  return {
    location: {
      name: "Kolkata",
      region: "West Bengal",
      country: "India",
      lat: 22.57,
      lon: 88.36,
      localtime: "2024-07-15 18:30",
      tz_id: "Asia/Kolkata",
    },
    current: {
      last_updated: "2024-07-15 18:15",
      temp_c: 28.4,
      feelslike_c: 34.1,
      condition: { text: "Moderate rain", icon: "//cdn.weatherapi.com/weather/64x64/day/302.png" },
      humidity: 89,
      wind_kph: 21.6,
      wind_dir: "SSE",
      wind_degree: 155,
      gust_kph: 33.5,
      precip_mm: 6.2,
      pressure_mb: 998.0,
      cloud: 90,
      vis_km: 7.0,
      uv: 3.0,
      is_day: 1,
    },
  };
}

function clearCurrent() {
  return {
    location: {
      name: "Cairo",
      region: "Cairo",
      country: "Egypt",
      lat: 30.06,
      lon: 31.24,
      localtime: "2024-07-15 12:00",
      tz_id: "Africa/Cairo",
    },
    current: {
      last_updated: "2024-07-15 11:45",
      temp_c: 35.2,
      feelslike_c: 34.0,
      condition: { text: "Sunny", icon: "//cdn.weatherapi.com/weather/64x64/day/113.png" },
      humidity: 20,
      wind_kph: 10.8,
      wind_dir: "N",
      wind_degree: 350,
      gust_kph: 14.0,
      precip_mm: 0.0,
      pressure_mb: 1009.0,
      cloud: 0,
      vis_km: 10.0,
      uv: 9.0,
      is_day: 1,
    },
  };
}

test("url builders throw when key is empty", () => {
  assert.throws(() => searchUrl("", "Kolkata"));
  assert.throws(() => currentUrl(null, "Kolkata"));
  assert.throws(() => forecastUrl(undefined, "Kolkata"));
});

test("url builders build correct urls", () => {
  assert.equal(searchUrl(KEY, "kol"), `https://api.weatherapi.com/v1/search.json?key=test-key&q=kol`);
  assert.equal(currentUrl(KEY, "Kolkata"), `https://api.weatherapi.com/v1/current.json?key=test-key&q=Kolkata&aqi=no`);
  assert.equal(forecastUrl(KEY, "22.57,88.36"), `https://api.weatherapi.com/v1/forecast.json?key=test-key&q=22.57%2C88.36&days=3&aqi=no&alerts=no`);
});

test("parseSearch returns [] for non-array", () => {
  assert.deepEqual(parseSearch(null), []);
  assert.deepEqual(parseSearch({}), []);
});

test("parseSearch maps results", () => {
  const out = parseSearch([
    { name: "Kolkata", region: "West Bengal", country: "India", lat: 22.57, lon: 88.36, url: "kolkata-india" },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "Kolkata");
  assert.equal(out[0].region, "West Bengal");
  assert.equal(out[0].country, "India");
});

test("parseCurrent rainy report", () => {
  const c = parseCurrent(rainyCurrent());
  assert.equal(c.name, "Kolkata");
  assert.equal(c.region, "West Bengal");
  assert.equal(c.country, "India");
  assert.equal(c.latitude, 22.57);
  assert.equal(c.longitude, 88.36);
  assert.equal(c.localtime, "2024-07-15 18:30");
  assert.equal(c.tz, "Asia/Kolkata");
  assert.equal(c.tempC, 28.4);
  assert.equal(c.feelsLikeC, 34.1);
  assert.equal(c.condition, "Moderate rain");
  assert.equal(c.icon, "https://cdn.weatherapi.com/weather/64x64/day/302.png");
  assert.equal(c.humidity, 89);
  assert.equal(c.windKph, 21.6);
  assert.equal(c.windDir, "SSE");
  assert.equal(c.windDegree, 155);
  assert.equal(c.gustKph, 33.5);
  assert.equal(c.precipMm, 6.2);
  assert.equal(c.pressureMb, 998.0);
  assert.equal(c.cloud, 90);
  assert.equal(c.visKm, 7.0);
  assert.equal(c.uv, 3.0);
  assert.equal(c.isDay, 1);
  assert.equal(c.updatedAt, "2024-07-15 18:15");
});

test("parseCurrent clear report", () => {
  const c = parseCurrent(clearCurrent());
  assert.equal(c.name, "Cairo");
  assert.equal(c.condition, "Sunny");
  assert.equal(c.tempC, 35.2);
  assert.equal(c.humidity, 20);
  assert.equal(c.precipMm, 0.0);
  assert.equal(c.icon.startsWith("https:"), true);
});

test("parseForecast keeps only hours ahead of localtime", () => {
  const data = {
    location: { name: "Kolkata", localtime: "2024-07-15 18:30", tz_id: "Asia/Kolkata" },
    forecast: {
      forecastday: [
        {
          date: "2024-07-15",
          day: {
            maxtemp_c: 31.0,
            mintemp_c: 26.0,
            daily_chance_of_rain: 80,
            totalprecip_mm: 12.4,
            condition: { text: "Moderate rain", icon: "//cdn.weatherapi.com/weather/64x64/day/302.png" },
          },
          astro: { sunrise: "05:10 AM", sunset: "06:25 PM" },
          hour: [
            { time_epoch: 1, time: "2024-07-15 17:00", temp_c: 29.0, condition: { text: "Rain", icon: "//cdn.weatherapi.com/weather/64x64/day/302.png" }, chanceofrain: "70", precip_mm: 1.0 },
            { time_epoch: 2, time: "2024-07-15 19:00", temp_c: 27.5, condition: { text: "Patchy rain", icon: "//cdn.weatherapi.com/weather/64x64/night/293.png" }, chanceofrain: "60", precip_mm: 0.5 },
          ],
        },
        {
          date: "2024-07-16",
          day: {
            maxtemp_c: 32.0,
            mintemp_c: 27.0,
            daily_chance_of_rain: 40,
            totalprecip_mm: 4.0,
            condition: { text: "Partly cloudy", icon: "//cdn.weatherapi.com/weather/64x64/day/116.png" },
          },
          astro: { sunrise: "05:11 AM", sunset: "06:25 PM" },
          hour: [
            { time_epoch: 3, time: "2024-07-16 09:00", temp_c: 30.0, condition: { text: "Cloudy", icon: "//cdn.weatherapi.com/weather/64x64/day/119.png" }, chanceofrain: "20", precip_mm: 0.0 },
          ],
        },
      ],
    },
  };

  const { hours, days } = parseForecast(data);
  assert.equal(hours.length, 2);
  assert.equal(hours[0].time, "2024-07-15 19:00");
  assert.equal(hours[0].chanceOfRain, "60");
  assert.equal(hours[0].icon.startsWith("https:"), true);

  assert.equal(days.length, 2);
  assert.equal(days[0].date, "2024-07-15");
  assert.equal(days[0].maxC, 31.0);
  assert.equal(days[0].minC, 26.0);
  assert.equal(days[0].chanceOfRain, 80);
  assert.equal(days[0].precipMm, 12.4);
  assert.equal(days[0].sunrise, "05:10 AM");
  assert.equal(days[0].sunset, "06:25 PM");
});

test("parseForecast caps days at 3 and handles missing pieces", () => {
  const mk = (d) => ({
    date: d,
    day: {
      maxtemp_c: 1,
      mintemp_c: 0,
      daily_chance_of_rain: 0,
      totalprecip_mm: 0,
      condition: { text: "Clear", icon: "" },
    },
    astro: { sunrise: "06:00 AM", sunset: "06:00 PM" },
    hour: [],
  });
  const data = {
    location: { localtime: "2024-01-01 00:00" },
    forecast: { forecastday: [mk("2024-01-01"), mk("2024-01-02"), mk("2024-01-03"), mk("2024-01-04")] },
  };
  const { hours, days } = parseForecast(data);
  assert.deepEqual(hours, []);
  assert.equal(days.length, 3);
});
