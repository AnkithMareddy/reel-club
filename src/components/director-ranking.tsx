import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRatingDisplay } from "@/components/star-rating";
import { tmdbPosterUrl } from "@/lib/tmdb";
import type { DirectorStat } from "@/lib/stats";

/** Director leaderboard rows with TMDB headshots, watch counts, and avg stars. */
export function DirectorRanking({ directors, limit = 6 }: { directors: DirectorStat[]; limit?: number }) {
  const shown = directors.slice(0, limit);
  if (shown.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough data yet.</p>;
  }
  const maxCount = Math.max(...shown.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {shown.map((d, i) => (
        <div key={d.id} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-sm font-semibold text-muted-foreground">
            {i + 1}
          </span>
          <Avatar className="size-10 shrink-0">
            <AvatarImage
              src={d.profilePath ? (tmdbPosterUrl(d.profilePath, "w185") ?? undefined) : undefined}
              alt={d.name}
              className="object-cover"
            />
            <AvatarFallback>{d.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium">{d.name}</p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {d.count} watched
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(6, (d.count / maxCount) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <StarRatingDisplay value={Math.round(d.avg)} />
            <span className="text-[11px] text-muted-foreground">{(d.avg / 2).toFixed(1)} avg</span>
          </div>
        </div>
      ))}
    </div>
  );
}
