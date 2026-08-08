import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export default function ErrorState({ onRetry, isRetrying }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-16 text-center"
      role="alert"
      data-testid="departure-error"
    >
      <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <p className="text-lg font-medium text-foreground">Train data is temporarily unavailable</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        The display will keep trying automatically.
      </p>
      <Button className="mt-5" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? "Trying again…" : "Try again"}
      </Button>
    </div>
  );
}
