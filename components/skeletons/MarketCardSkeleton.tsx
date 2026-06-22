export function MarketCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 animate-pulse">
      {/* Header row: ID + badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="h-3 bg-muted rounded w-12" />
        <div className="h-5 bg-muted rounded-full w-14" />
      </div>
      {/* Question */}
      <div className="h-4 bg-muted rounded w-4/5 mb-2" />
      <div className="h-4 bg-muted rounded w-3/5 mb-4" />
      {/* Probability bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-3 bg-muted rounded w-16" />
          <div className="h-3 bg-muted rounded w-16" />
        </div>
        <div className="h-1.5 bg-muted rounded-full" />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <div className="h-3 bg-muted rounded w-24" />
        <div className="h-3 bg-muted rounded w-20" />
      </div>
    </div>
  );
}
