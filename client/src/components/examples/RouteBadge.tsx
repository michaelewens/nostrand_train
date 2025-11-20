import RouteBadge from '../RouteBadge';

export default function RouteBadgeExample() {
  return (
    <div className="flex gap-4 p-6">
      <RouteBadge route="A" />
      <RouteBadge route="C" />
    </div>
  );
}
