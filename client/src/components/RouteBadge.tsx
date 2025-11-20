interface RouteBadgeProps {
  route: string;
}

export default function RouteBadge({ route }: RouteBadgeProps) {
  return (
    <div 
      className="flex items-center justify-center w-14 h-14 rounded-full font-black text-4xl"
      style={{ 
        backgroundColor: '#0039A6',
        color: '#FFFFFF'
      }}
      data-testid={`badge-route-${route}`}
    >
      {route}
    </div>
  );
}
