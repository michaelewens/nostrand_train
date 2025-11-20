import DepartureCard from '../DepartureCard';

export default function DepartureCardExample() {
  return (
    <div className="max-w-2xl mx-auto bg-card rounded-md overflow-hidden">
      <DepartureCard route="A" destination="Manhattan via 8th Ave" minutesAway={2} />
      <DepartureCard route="C" destination="Manhattan via 8th Ave" minutesAway={5} />
      <DepartureCard route="A" destination="Manhattan via 8th Ave" minutesAway={0} />
      <DepartureCard route="C" destination="Manhattan via 8th Ave" minutesAway={12} />
    </div>
  );
}
