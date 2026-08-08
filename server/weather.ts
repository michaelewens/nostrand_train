const LATITUDE = process.env.WEATHER_LATITUDE || "40.6804";
const LONGITUDE = process.env.WEATHER_LONGITUDE || "-73.9496";
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface Weather {
  temperatureF: number;
  apparentF: number;
  highF: number;
  lowF: number;
  precipitationChance: number;
  condition: string;
  weatherCode: number;
}

interface WeatherCache {
  value: Weather;
  expiresAt: number;
}

let cache: WeatherCache | undefined;

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

export function transformWeather(data: any): Weather {
  const current = data.current || {};
  const daily = data.daily || {};
  const weatherCode = Number(current.weather_code);

  return {
    temperatureF: Math.round(Number(current.temperature_2m)),
    apparentF: Math.round(Number(current.apparent_temperature)),
    highF: Math.round(Number(daily.temperature_2m_max?.[0])),
    lowF: Math.round(Number(daily.temperature_2m_min?.[0])),
    precipitationChance: Math.round(Number(daily.precipitation_probability_max?.[0] || 0)),
    condition: weatherCondition(weatherCode),
    weatherCode,
  };
}

export async function fetchWeather(): Promise<Weather> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

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

  const value = transformWeather(await response.json());
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

