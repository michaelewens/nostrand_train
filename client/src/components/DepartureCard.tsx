import RouteBadge from './RouteBadge';

interface DepartureCardProps {
  route: string;
  destination: string;
  minutesAway: number;
}

export default function DepartureCard({ route, destination, minutesAway }: DepartureCardProps) {
  const getTimeDisplay = () => {
    if (minutesAway < 1) {
      return "Arriving";
    }
    return `${Math.floor(minutesAway)} min`;
  };

  return (
    <div 
      className="flex items-center gap-4 p-4 border-b border-border last:border-b-0"
      data-testid={`card-departure-${route}`}
    >
      <RouteBadge route={route} />
      
      <div className="flex-1 min-w-0">
        <p className="text-lg font-medium text-foreground" data-testid="text-destination">
          {destination}
        </p>
      </div>
      
      <div className="text-right">
        <p 
          className="text-4xl font-bold tabular-nums text-foreground"
          data-testid="text-time"
        >
          {getTimeDisplay()}
        </p>
      </div>
    </div>
  );
}
