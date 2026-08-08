const TRANSITER_API_BASE = process.env.TRANSITER_API_BASE || "https://demo.transiter.dev";
const SYSTEM_ID = "us-ny-subway";
const NOSTRAND_STOP_ID = "A46N";

export interface Departure {
  route: string;
  destination: string;
  arrivalTime: number;
}

export function transformDepartures(data: any, nowSeconds = Math.floor(Date.now() / 1000)): Departure[] {
  return (data.stopTimes || [])
    .filter((stopTime: any) => {
      const route = stopTime.trip?.route?.id;
      return route === "A" || route === "C";
    })
    .map((stopTime: any) => ({
      route: stopTime.trip.route.id,
      destination: stopTime.trip.destination?.name || "Manhattan",
      arrivalTime: Number.parseInt(stopTime.arrival?.time || stopTime.departure?.time, 10),
    }))
    .filter((departure: Departure) =>
      Number.isFinite(departure.arrivalTime) && departure.arrivalTime >= nowSeconds - 30
    )
    .sort((a: Departure, b: Departure) => a.arrivalTime - b.arrivalTime)
    .slice(0, 10);
}

export async function fetchDepartures(): Promise<Departure[]> {
  const response = await fetch(
    `${TRANSITER_API_BASE}/systems/${SYSTEM_ID}/stops/${NOSTRAND_STOP_ID}`,
    { signal: AbortSignal.timeout(8_000) },
  );

  if (!response.ok) {
    throw new Error(`Transiter API error: ${response.status} ${response.statusText}`);
  }

  return transformDepartures(await response.json());
}

