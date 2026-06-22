export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-muted w-8 h-8" />
        <div className="h-3 bg-muted rounded w-20" />
      </div>
      <div className="h-7 bg-muted rounded w-16" />
    </div>
  );
}
