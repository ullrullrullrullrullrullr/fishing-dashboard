import { getJson } from './http.js';
import { FETCH_TIMEOUT_MS } from './config.js';

const FORECAST_HOURLY = [
  'temperature_2m', 'weather_code', 'wind_speed_10m', 'wind_direction_10m',
  'wind_gusts_10m', 'precipitation_probability',
];
const MARINE_HOURLY = [
  'wave_height', 'wave_period', 'swell_wave_height', 'swell_wave_period', 'sea_surface_temperature',
];

function query(spots, hourly, extra = {}) {
  return new URLSearchParams({
    latitude: spots.map((s) => s.lat).join(','),
    longitude: spots.map((s) => s.lon).join(','),
    hourly: hourly.join(','),
    timezone: 'Asia/Tokyo',
    forecast_days: '3',
    ...extra,
  });
}

export const buildForecastUrl = (spots) =>
  `https://api.open-meteo.com/v1/forecast?${query(spots, FORECAST_HOURLY, { wind_speed_unit: 'ms' })}`;
export const buildMarineUrl = (spots) =>
  `https://marine-api.open-meteo.com/v1/marine?${query(spots, MARINE_HOURLY)}`;

const JST_OFFSET_SECONDS = 9 * 60 * 60;

const num = (arr, i) => {
  const v = arr?.[i];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

export function normalizeHourly(forecast, marine) {
  const f = forecast?.hourly;
  const m = marine?.hourly;
  if (!f || !m || !Array.isArray(f.time) || !Array.isArray(m.time)) {
    throw new Error('天気データの形式が正しくありません');
  }
  if (forecast.utc_offset_seconds !== JST_OFFSET_SECONDS || marine.utc_offset_seconds !== JST_OFFSET_SECONDS) {
    throw new Error('タイムゾーンが日本時間ではない応答です');
  }
  if (f.time.length !== m.time.length || f.time.some((t, i) => t !== m.time[i])) {
    throw new Error('天気と波の時刻が一致しません');
  }
  return f.time.map((time, i) => ({
    time,
    temp: num(f.temperature_2m, i),
    weatherCode: num(f.weather_code, i),
    windSpeed: num(f.wind_speed_10m, i),
    windDir: num(f.wind_direction_10m, i),
    windGust: num(f.wind_gusts_10m, i),
    precipProb: num(f.precipitation_probability, i),
    waveHeight: num(m.wave_height, i),
    wavePeriod: num(m.wave_period, i),
    swellHeight: num(m.swell_wave_height, i),
    swellPeriod: num(m.swell_wave_period, i),
    seaTemp: num(m.sea_surface_temperature, i),
  }));
}

export async function fetchWeather(
  spots,
  { fetchImpl = globalThis.fetch, now = () => Date.now(), timeoutMs = FETCH_TIMEOUT_MS } = {},
) {
  const [f, m] = await Promise.all([
    getJson(buildForecastUrl(spots), fetchImpl, timeoutMs),
    getJson(buildMarineUrl(spots), fetchImpl, timeoutMs),
  ]);
  const fa = Array.isArray(f) ? f : [f];
  const ma = Array.isArray(m) ? m : [m];
  if (fa.length !== spots.length || ma.length !== spots.length) {
    throw new Error('釣り場の数とデータの数が一致しません');
  }
  const bySpot = {};
  spots.forEach((s, i) => {
    bySpot[s.id] = normalizeHourly(fa[i], ma[i]);
  });
  return { fetchedAt: now(), bySpot };
}
