import { Train } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({ message = "No trains scheduled" }: EmptyStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-16 px-4"
      data-testid="empty-state"
    >
      <Train className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-lg text-muted-foreground text-center">
        {message}
      </p>
    </div>
  );
}
