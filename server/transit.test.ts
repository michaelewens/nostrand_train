import assert from "node:assert/strict";
import test from "node:test";
import { transformDepartures } from "./transit";
import { transformWeather, weatherCondition } from "./weather";

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

