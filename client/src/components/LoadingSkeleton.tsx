import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingSkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i}
          className="flex items-center gap-4 p-4 border-b border-border"
          data-testid={`skeleton-departure-${i}`}
        >
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      ))}
    </div>
  );
}
