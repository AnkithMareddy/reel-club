"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRatingDisplay } from "@/components/star-rating";
import { SegmentDialog } from "@/components/bar-chart";
import { tmdbPosterUrl } from "@/lib/tmdb";
import type { DirectorStat } from "@/lib/stats";

/** Director leaderboard with headshots; the bar drills into their movies. */
export function DirectorRanking({
  directors,
  limit = 6,
}: {
  directors: DirectorStat[];
  limit?: number;
}) {
  const [drilldown, setDrilldown] = useState<DirectorStat | null>(null);
  const shown = directors.slice(0, limit);

  if (shown.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough data yet.</p>;
  }
  const maxCount = Math.max(...shown.map((d) => d.count), 1);

  return (
    <>
      <div className="space-y-3">
        {shown.map((d, i) => (
          <div key={d.id} className="flex items-center gap-3">
            <span className="w-5 shrink-0 text-sm font-semibold text-muted-foreground">
              {i + 1}
            </span>
            {d.tmdbId ? (
              <Link href={`/people/${d.tmdbId}`} className="shrink-0">
                <Avatar className="size-10 transition-transform hover:scale-105">
                  <AvatarImage
                    src={d.profilePath ? (tmdbPosterUrl(d.profilePath, "w185") ?? undefined) : undefined}
                    alt={d.name}
                    className="object-cover"
                  />
                  <AvatarFallback>{d.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Avatar className="size-10 shrink-0">
                <AvatarImage
                  src={d.profilePath ? (tmdbPosterUrl(d.profilePath, "w185") ?? undefined) : undefined}
                  alt={d.name}
                  className="object-cover"
                />
                <AvatarFallback>{d.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            <button
              type="button"
              onClick={() => setDrilldown(d)}
              className="group min-w-0 flex-1 cursor-pointer space-y-1 text-left"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium group-hover:underline">{d.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{d.count} watched</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-opacity group-hover:opacity-80"
                  style={{ width: `${Math.max(6, (d.count / maxCount) * 100)}%` }}
                />
              </div>
            </button>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <StarRatingDisplay value={Math.round(d.avg)} />
              <span className="text-[11px] text-muted-foreground">{(d.avg / 2).toFixed(1)} avg</span>
            </div>
          </div>
        ))}
      </div>

      <SegmentDialog
        row={
          drilldown
            ? {
                label: drilldown.name,
                sublabel: `${(drilldown.avg / 2).toFixed(1)}★ avg`,
                movies: drilldown.movies,
              }
            : null
        }
        onClose={() => setDrilldown(null)}
      />
    </>
  );
}
