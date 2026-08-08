import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchDepartureSnapshot,
  resetDepartureCacheForTests,
  transformDepartures,
} from "./transit";
import { transformWeather, weatherCondition } from "./weather";
import { buildDisplayPayload } from "./display";

test("transformDepartures filters, drops stale trains, and sorts by arrival", () => {
  const departures = transformDepartures({
    stopTimes: [
      { trip: { route: { id: "G" }, destination: { name: "Court Sq" } }, arrival: { time: "1300" } },
      { trip: { route: { id: "C" }, destination: { name: "168 St" } }, arrival: { time: "1250" } },
      { trip: { route: { id: "A" }, destination: { name: "Inwood" } }, arrival: { time: "1210" } },
      { trip: { route: { id: "A" }, destination: { name: "Old train" } }, arrival: { time: "900" } },
    ],
  }, 1000);

  assert.deepEqual(departures.map(({ route, arrivalTime }) => ({ route, arrivalTime })), [
    { route: "A", arrivalTime: 1210 },
    { route: "C", arrivalTime: 1250 },
  ]);
});

test("weather mapping produces compact display-ready values", () => {
  const weather = transformWeather({
    current: { temperature_2m: 71.6, apparent_temperature: 73.2, weather_code: 61 },
    daily: {
      temperature_2m_max: [78.4],
      temperature_2m_min: [63.1],
      precipitation_probability_max: [45],
    },
  });

  assert.deepEqual(weather, {
    temperatureF: 72,
    apparentF: 73,
    highF: 78,
    lowF: 63,
    precipitationChance: 45,
    condition: "Rain",
    weatherCode: 61,
  });
  assert.equal(weatherCondition(95), "Thunderstorms");
});

test("malformed weather is rejected instead of becoming zero-degree data", () => {
  assert.throws(
    () => transformWeather({ current: {}, daily: {} }),
    /Invalid Open-Meteo forecast payload/,
  );
});

test("display payload marks stale data and removes arrivals that already left", () => {
  const now = 1_800_000_000_000;
  const payload = buildDisplayPayload({
    departures: [
      { route: "A", destination: "Departed", arrivalTime: now / 1000 - 60 },
      { route: "C", destination: "168 St", arrivalTime: now / 1000 + 300 },
    ],
    fetchedAt: now - 45_000,
    stale: true,
  }, null, now);

  assert.equal(payload.stale, true);
  assert.deepEqual(payload.trains.map(({ route, minutes }) => ({ route, minutes })), [
    { route: "C", minutes: 5 },
  ]);
});

test("departure requests are coalesced and recent cache survives an outage", async () => {
  const originalFetch = globalThis.fetch;
  const originalDateNow = Date.now;
  const originalWarn = console.warn;
  let now = 1_800_000_000_000;
  let calls = 0;

  try {
    Date.now = () => now;
    console.warn = () => {};
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({
        stopTimes: [{
          trip: { route: { id: "A" }, destination: { name: "Inwood" } },
          arrival: { time: String(now / 1000 + 600) },
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    resetDepartureCacheForTests();
    const [first, second] = await Promise.all([
      fetchDepartureSnapshot(),
      fetchDepartureSnapshot(),
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(first.departures, second.departures);

    now += 16_000;
    globalThis.fetch = async () => {
      calls += 1;
      throw new Error("temporary outage");
    };
    const fallback = await fetchDepartureSnapshot();
    assert.equal(fallback.stale, true);
    assert.equal(fallback.departures[0]?.route, "A");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalDateNow;
    console.warn = originalWarn;
    resetDepartureCacheForTests();
  }
});
