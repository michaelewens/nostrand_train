import { z } from "zod";
import { weatherSchema, type Weather } from "@shared/schema";

const LATITUDE = process.env.WEATHER_LATITUDE || "40.6804";
const LONGITUDE = process.env.WEATHER_LONGITUDE || "-73.9496";
const CACHE_TTL_MS = 10 * 60_000;
const MAX_STALE_MS = 2 * 60 * 60_000;
const RETRY_DELAY_MS = 30_000;

const openMeteoSchema = z.object({
  current: z.object({
    temperature_2m: z.number().finite(),
    apparent_temperature: z.number().finite(),
    weather_code: z.number().int().min(0).max(99),
  }),
  daily: z.object({
    temperature_2m_max: z.array(z.number().finite()).min(1),
    temperature_2m_min: z.array(z.number().finite()).min(1),
    precipitation_probability_max: z.array(z.number().finite()).optional(),
  }),
});

interface WeatherCache {
  value: Weather;
  fetchedAt: number;
  refreshAfter: number;
}

let cache: WeatherCache | undefined;
let inFlight: Promise<Weather> | undefined;

export function weatherCondition(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorms";
  return "Unsettled";
}

export function transformWeather(data: unknown): Weather {
  const parsed = openMeteoSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid Open-Meteo forecast payload");

  const { current, daily } = parsed.data;
  return weatherSchema.parse({
    temperatureF: Math.round(current.temperature_2m),
    apparentF: Math.round(current.apparent_temperature),
    highF: Math.round(daily.temperature_2m_max[0]),
    lowF: Math.round(daily.temperature_2m_min[0]),
    precipitationChance: Math.round(daily.precipitation_probability_max?.[0] ?? 0),
    condition: weatherCondition(current.weather_code),
    weatherCode: current.weather_code,
  });
}

async function fetchFromOpenMeteo(): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: LATITUDE,
    longitude: LONGITUDE,
    current: "temperature_2m,apparent_temperature,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "fahrenheit",
    timezone: "America/New_York",
    forecast_days: "1",
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }
  return transformWeather(await response.json());
}

export async function fetchWeather(): Promise<Weather> {
  const now = Date.now();
  if (cache && cache.refreshAfter > now) return cache.value;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const value = await fetchFromOpenMeteo();
      const fetchedAt = Date.now();
      cache = { value, fetchedAt, refreshAfter: fetchedAt + CACHE_TTL_MS };
      return value;
    } catch (error) {
      const failedAt = Date.now();
      if (cache && failedAt - cache.fetchedAt <= MAX_STALE_MS) {
        cache.refreshAfter = failedAt + RETRY_DELAY_MS;
        console.warn("Open-Meteo unavailable; serving recent cached weather", error);
        return cache.value;
      }
      throw error;
    } finally {
      inFlight = undefined;
    }
  })();

  return inFlight;
}

export function resetWeatherCacheForTests(): void {
  cache = undefined;
  inFlight = undefined;
}
