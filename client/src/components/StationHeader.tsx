import { RefreshCw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

interface StationHeaderProps {
  stationName: string;
  direction: string;
  routes: string[];
  lastUpdated: Date;
  onRefresh: () => void;
  isRefreshing?: boolean;
  selectedLine: string;
  onLineSelect: (line: string) => void;
}

export default function StationHeader({ 
  stationName, 
  direction, 
  routes, 
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  selectedLine,
  onLineSelect
}: StationHeaderProps) {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 60) {
        setTimeSinceUpdate(`${seconds}s ago`);
      } else {
        const minutes = Math.floor(seconds / 60);
        setTimeSinceUpdate(`${minutes}m ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <h1 className="text-3xl font-bold text-foreground truncate" data-testid="text-station">
                {stationName}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-direction">
              {direction}
            </p>
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={onRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {routes.map((route) => (
              <Badge 
                key={route}
                variant={selectedLine === route ? "default" : "secondary"}
                className="text-base font-bold px-3 py-1 cursor-pointer hover-elevate active-elevate-2"
                style={selectedLine === route ? { backgroundColor: '#0039A6', color: '#FFFFFF' } : undefined}
                onClick={() => onLineSelect(route)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onLineSelect(route);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={selectedLine === route}
                aria-label={`Show ${route} train departures`}
                data-testid={`badge-route-filter-${route}`}
              >
                {route}
              </Badge>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground whitespace-nowrap" data-testid="text-updated">
            Updated {timeSinceUpdate}
          </p>
        </div>
      </div>
    </header>
  );
}
