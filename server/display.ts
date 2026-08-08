import { displayPayloadSchema, type DisplayPayload, type Weather } from "@shared/schema";
import type { DepartureSnapshot } from "./transit";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});

export function buildDisplayPayload(
  snapshot: DepartureSnapshot,
  weather: Weather | null,
  now = Date.now(),
): DisplayPayload {
  const trains = snapshot.departures
    .filter((departure) => departure.arrivalTime * 1000 >= now - 30_000)
    .slice(0, 4)
    .map((departure) => ({
      ...departure,
      minutes: Math.max(0, Math.floor((departure.arrivalTime * 1000 - now) / 60_000)),
    }));

  return displayPayloadSchema.parse({
    version: 1,
    station: { name: "Nostrand Av", direction: "Manhattan", stopId: "A46N" },
    generatedAt: Math.floor(now / 1000),
    updated: timeFormatter.format(snapshot.fetchedAt),
    stale: snapshot.stale,
    trains,
    weather,
  });
}
