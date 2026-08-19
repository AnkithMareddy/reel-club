"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { StarRatingDisplay } from "@/components/star-rating";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tmdbPosterUrl } from "@/lib/tmdb";
import type { SegmentMovie } from "@/lib/stats";

type BarChartRow = {
  label: string;
  value: number;
  sublabel?: string;
  /** When present the bar becomes clickable and opens a drill-down. */
  movies?: SegmentMovie[];
};

/**
 * Minimal horizontal bar chart — no charting library, just flexbox.
 * Value rendering is described with serializable props rather than a
 * formatter function, since this is a client component rendered from
 * server pages.
 */
export function BarChart({
  rows,
  format = "decimal",
  unit,
  max,
}: {
  rows: BarChartRow[];
  /** "decimal" renders 8.5, "integer" renders 3. */
  format?: "decimal" | "integer";
  /** Appended after the value, e.g. "watched". */
  unit?: string;
  /** Defaults to the largest value in `rows`. */
  max?: number;
}) {
  const [drilldown, setDrilldown] = useState<BarChartRow | null>(null);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough data yet.</p>;
  }
  const maxValue = max ?? Math.max(...rows.map((r) => r.value), 1);
  const valueFormatter = (v: number) =>
    `${format === "integer" ? v : v.toFixed(1)}${unit ? ` ${unit}` : ""}`;

  return (
    <>
      <div className="space-y-2.5">
        {rows.map((row) => {
          const drillable = (row.movies?.length ?? 0) > 0;
          const body = (
            <>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="flex items-center gap-1 font-medium">
                  {row.label}
                  {drillable && (
                    <ChevronRight className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {valueFormatter(row.value)}
                  {row.sublabel ? ` · ${row.sublabel}` : ""}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-opacity group-hover:opacity-80"
                  style={{ width: `${Math.max(4, (row.value / maxValue) * 100)}%` }}
                />
              </div>
            </>
          );

          return drillable ? (
            <button
              key={row.label}
              type="button"
              onClick={() => setDrilldown(row)}
              className="group w-full cursor-pointer space-y-1 rounded-md text-left"
            >
              {body}
            </button>
          ) : (
            <div key={row.label} className="space-y-1">
              {body}
            </div>
          );
        })}
      </div>

      <SegmentDialog row={drilldown} onClose={() => setDrilldown(null)} />
    </>
  );
}

/** Shared drill-down sheet: the movies making up one chart segment. */
export function SegmentDialog({
  row,
  onClose,
}: {
  row: { label: string; sublabel?: string; movies?: SegmentMovie[] } | null;
  onClose: () => void;
}) {
  const movies = row?.movies ?? [];
  return (
    <Dialog open={row != null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{row?.label}</DialogTitle>
          <DialogDescription>
            {movies.length} movie{movies.length === 1 ? "" : "s"}
            {row?.sublabel ? ` · ${row.sublabel}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          {movies.map((m, i) => (
            <Link
              key={`${m.tmdbId}-${i}`}
              href={`/movies/${m.tmdbId}`}
              className="flex items-center gap-3 rounded-md p-1.5 hover:bg-muted"
            >
              <div className="relative aspect-[2/3] w-9 shrink-0 overflow-hidden rounded bg-muted">
                {tmdbPosterUrl(m.posterPath, "w92") ? (
                  <Image
                    src={tmdbPosterUrl(m.posterPath, "w92")!}
                    alt={m.title}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm">{m.title}</span>
              <StarRatingDisplay value={m.score} className="shrink-0" />
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
