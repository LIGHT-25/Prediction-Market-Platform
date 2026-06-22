export function ClaimButtonSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 rounded bg-muted" />
        <div className="h-4 bg-muted rounded w-28" />
      </div>
      <div className="h-3 bg-muted rounded w-4/5 mb-4" />
      <div className="h-12 bg-muted rounded-xl" />
    </div>
  );
}
