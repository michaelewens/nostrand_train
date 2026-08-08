import StationHeader from '../StationHeader';
import { useState } from 'react';

export default function StationHeaderExample() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLine, setSelectedLine] = useState('A');

  const handleRefresh = () => {
    console.log('Refresh triggered');
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div>
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
      <div className="h-96 bg-muted/20" />
    </div>
  );
}
