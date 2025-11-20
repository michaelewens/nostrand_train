import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import StationHeader from '@/components/StationHeader';
import DepartureCard from '@/components/DepartureCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import EmptyState from '@/components/EmptyState';
import { Card } from '@/components/ui/card';
import type { Departure as APIDeparture } from '@shared/schema';

interface Departure {
  route: string;
  destination: string;
  minutesAway: number;
}

export default function Home() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLine, setSelectedLine] = useState<string>('A');

  const { data: apiDepartures, isLoading, refetch } = useQuery<APIDeparture[]>({
    queryKey: ['/api/departures'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Store the raw API data with timestamps
  const [trainData, setTrainData] = useState<APIDeparture[]>([]);

  // Update stored data when API refreshes
  useEffect(() => {
    if (apiDepartures) {
      setTrainData(apiDepartures);
      setLastUpdated(new Date());
    }
  }, [apiDepartures]);

  // Recalculate minutes from timestamps every second
  useEffect(() => {
    const updateDepartures = () => {
      const now = Math.floor(Date.now() / 1000);
      const converted = trainData
        .filter(d => d.route === selectedLine) // Filter by selected line
        .map(d => ({
          route: d.route,
          destination: d.destination,
          minutesAway: (d.arrivalTime - now) / 60,
        }))
        .filter(d => d.minutesAway > -0.5) // Remove trains that left more than 30 seconds ago
        .slice(0, 5);
      
      setDepartures(converted);
    };

    updateDepartures();
    const interval = setInterval(updateDepartures, 1000);

    return () => clearInterval(interval);
  }, [trainData, selectedLine]);

  const handleRefresh = async () => {
    console.log('Refreshing train data...');
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <StationHeader
        stationName="Nostrand Ave"
        direction="To Manhattan"
        routes={['A', 'C']}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        selectedLine={selectedLine}
        onLineSelect={setSelectedLine}
      />

      <main className="max-w-2xl mx-auto p-4">
        <Card className="overflow-hidden">
          {isLoading ? (
            <LoadingSkeleton />
          ) : departures.length === 0 ? (
            <EmptyState message="No trains scheduled" />
          ) : (
            <div data-testid="list-departures">
              {departures.slice(0, 5).map((departure, index) => (
                <DepartureCard
                  key={`${departure.route}-${index}`}
                  route={departure.route}
                  destination={departure.destination}
                  minutesAway={departure.minutesAway}
                />
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
