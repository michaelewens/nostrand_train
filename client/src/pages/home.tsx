import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StationHeader from "@/components/StationHeader";
import DepartureCard from "@/components/DepartureCard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { Card } from "@/components/ui/card";
import { getApiUrl } from "@/lib/queryClient";
import type { Departure as APIDeparture } from "@shared/schema";

interface DepartureFeed {
  departures: APIDeparture[];
  updatedAt: number;
  stale: boolean;
}

async function fetchDepartureFeed(signal: AbortSignal): Promise<DepartureFeed> {
  const response = await fetch(getApiUrl("/api/departures"), { signal });
  if (!response.ok) {
    throw new Error(`Departure API returned ${response.status}`);
  }

  const updatedAt = Number(response.headers.get("X-Data-Updated-At"));
  return {
    departures: await response.json() as APIDeparture[],
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : Date.now(),
    stale: response.headers.get("X-Data-Stale") === "true",
  };
}

export default function Home() {
  const [selectedLine, setSelectedLine] = useState<"A" | "C">("A");
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  const { data, isLoading, isFetching, isError, refetch } = useQuery<DepartureFeed>({
    queryKey: ["/api/departures"],
    queryFn: ({ signal }) => fetchDepartureFeed(signal),
    refetchInterval: 30_000,
    retry: 2,
  });

  useEffect(() => {
    const interval = window.setInterval(
      () => setNowSeconds(Math.floor(Date.now() / 1000)),
      1_000,
    );
    return () => window.clearInterval(interval);
  }, []);

  const departures = useMemo(() => {
    return (data?.departures ?? [])
      .filter((departure) => departure.route === selectedLine)
      .map((departure) => ({
        ...departure,
        minutesAway: (departure.arrivalTime - nowSeconds) / 60,
      }))
      .filter((departure) => departure.minutesAway > -0.5)
      .slice(0, 5);
  }, [data?.departures, nowSeconds, selectedLine]);

  const lastUpdated = useMemo(
    () => new Date(data?.updatedAt ?? Date.now()),
    [data?.updatedAt],
  );
  const showingStaleData = Boolean(data && (data.stale || isError));

  return (
    <div className="min-h-screen bg-background">
      <StationHeader
        stationName="Nostrand Ave"
        direction="To Manhattan"
        routes={["A", "C"]}
        lastUpdated={lastUpdated}
        onRefresh={() => { void refetch(); }}
        isRefreshing={isFetching}
        selectedLine={selectedLine}
        onLineSelect={setSelectedLine}
      />

      <main className="max-w-2xl mx-auto p-4">
        {showingStaleData && (
          <p
            className="mb-3 rounded-md border border-amber-600 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
            role="status"
          >
            Live data is temporarily unavailable. Showing the most recent update.
          </p>
        )}

        <Card className="overflow-hidden">
          {isLoading ? (
            <LoadingSkeleton />
          ) : isError && !data ? (
            <ErrorState onRetry={() => { void refetch(); }} isRetrying={isFetching} />
          ) : departures.length === 0 ? (
            <EmptyState message={`No ${selectedLine} trains currently reported`} />
          ) : (
            <ul data-testid="list-departures">
              {departures.map((departure) => (
                <DepartureCard
                  key={`${departure.route}-${departure.arrivalTime}`}
                  route={departure.route}
                  destination={departure.destination}
                  minutesAway={departure.minutesAway}
                />
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
