export function ActivityRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0 animate-pulse">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-2 h-2 rounded-full bg-muted shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3.5 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="h-5 bg-muted rounded-full w-16 shrink-0 ml-3" />
    </div>
  );
}
