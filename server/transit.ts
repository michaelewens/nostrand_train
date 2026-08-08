import { z } from "zod";
import { departureSchema, type Departure } from "@shared/schema";

const TRANSITER_API_BASE = process.env.TRANSITER_API_BASE || "https://demo.transiter.dev";
const SYSTEM_ID = "us-ny-subway";
const NOSTRAND_STOP_ID = "A46N";
const CACHE_TTL_MS = 15_000;
const MAX_STALE_MS = 5 * 60_000;
const RETRY_DELAY_MS = 5_000;

const stopTimeSchema = z.object({
  trip: z.object({
    route: z.object({ id: z.string() }),
    destination: z.object({ name: z.string() }).nullish(),
  }),
  arrival: z.object({ time: z.union([z.string(), z.number()]) }).nullish(),
  departure: z.object({ time: z.union([z.string(), z.number()]) }).nullish(),
});

const stopResponseSchema = z.object({
  stopTimes: z.array(z.unknown()).default([]),
});

export interface DepartureSnapshot {
  departures: Departure[];
  fetchedAt: number;
  stale: boolean;
}

interface DepartureCache {
  departures: Departure[];
  fetchedAt: number;
  refreshAfter: number;
}

let cache: DepartureCache | undefined;
let inFlight: Promise<DepartureSnapshot> | undefined;

function parseArrivalTime(value: string | number | undefined): number {
  if (typeof value === "number") return Math.trunc(value);
  if (typeof value === "string") return Number.parseInt(value, 10);
  return Number.NaN;
}

export function transformDepartures(data: unknown, nowSeconds = Math.floor(Date.now() / 1000)): Departure[] {
  const response = stopResponseSchema.safeParse(data);
  if (!response.success) throw new Error("Invalid Transiter stop payload");

  return response.data.stopTimes
    .flatMap((rawStopTime) => {
      const parsed = stopTimeSchema.safeParse(rawStopTime);
      if (!parsed.success) return [];

      const stopTime = parsed.data;
      const route = stopTime.trip.route.id;
      if (route !== "A" && route !== "C") return [];

      const departure = departureSchema.safeParse({
        route,
        destination: stopTime.trip.destination?.name || "Manhattan",
        arrivalTime: parseArrivalTime(stopTime.arrival?.time ?? stopTime.departure?.time),
      });
      return departure.success ? [departure.data] : [];
    })
    .filter((departure) => departure.arrivalTime >= nowSeconds - 30)
    .sort((a, b) => a.arrivalTime - b.arrivalTime)
    .slice(0, 10);
}

async function fetchFromTransiter(): Promise<Departure[]> {
  const response = await fetch(
    `${TRANSITER_API_BASE}/systems/${SYSTEM_ID}/stops/${NOSTRAND_STOP_ID}`,
    { signal: AbortSignal.timeout(8_000) },
  );

  if (!response.ok) {
    throw new Error(`Transiter API error: ${response.status} ${response.statusText}`);
  }

  return transformDepartures(await response.json());
}

export async function fetchDepartureSnapshot(): Promise<DepartureSnapshot> {
  const now = Date.now();
  if (cache && cache.refreshAfter > now) {
    return {
      departures: cache.departures,
      fetchedAt: cache.fetchedAt,
      stale: now - cache.fetchedAt > CACHE_TTL_MS,
    };
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const departures = await fetchFromTransiter();
      const fetchedAt = Date.now();
      cache = { departures, fetchedAt, refreshAfter: fetchedAt + CACHE_TTL_MS };
      return { departures, fetchedAt, stale: false };
    } catch (error) {
      const failedAt = Date.now();
      if (cache && failedAt - cache.fetchedAt <= MAX_STALE_MS) {
        cache.refreshAfter = failedAt + RETRY_DELAY_MS;
        console.warn("Transiter unavailable; serving recent cached departures", error);
        return { departures: cache.departures, fetchedAt: cache.fetchedAt, stale: true };
      }
      throw error;
    } finally {
      inFlight = undefined;
    }
  })();

  return inFlight;
}

export async function fetchDepartures(): Promise<Departure[]> {
  return (await fetchDepartureSnapshot()).departures;
}

export function resetDepartureCacheForTests(): void {
  cache = undefined;
  inFlight = undefined;
}
