interface Props {
  className?: string;
  shimmer?: boolean;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", shimmer = true, style }: Props) {
  return (
    <div
      className={`rounded-md bg-muted ${shimmer ? "skeleton-shimmer" : "animate-pulse"} ${className}`}
      style={style}
    />
  );
}

/** Skeleton de linha de ranking (avatar + duas barras de texto) */
export function RankingSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-6 w-10 rounded-full" />
    </div>
  );
}

/** Skeleton de card de mês */
export function MonthCardSkeleton() {
  return (
    <div className="rounded-2xl p-4 border border-border space-y-3">
      <Skeleton className="h-5 w-28" />
      <div className="grid grid-cols-7 gap-1.5">
        {[...Array(28)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
