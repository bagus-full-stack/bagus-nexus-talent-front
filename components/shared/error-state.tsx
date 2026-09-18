import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  isRetrying?: boolean;
}

export function ErrorState({
  title = "Erreur de chargement des données",
  message = "Une erreur réseau est survenue lors de la communication avec le serveur. Veuillez réessayer.",
  onRetry,
  className,
  isRetrying = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 my-4",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-5">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="gap-2 border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")} />
          {isRetrying ? "Tentative en cours..." : "Réessayer"}
        </Button>
      )}
    </div>
  );
}
