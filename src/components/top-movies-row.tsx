import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { tmdbPosterUrl } from "@/lib/tmdb";
import type { TopMovie } from "@/lib/stats";

/** Horizontal poster shelf of the highest-rated movies, with score badges. */
export function TopMoviesRow({ movies, limit = 8 }: { movies: TopMovie[]; limit?: number }) {
  const shown = movies.slice(0, limit);
  if (shown.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough data yet.</p>;
  }
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {shown.map((m, i) => {
        const poster = tmdbPosterUrl(m.posterPath, "w185");
        return (
          <Link key={m.movieId} href={`/movies/${m.tmdbId}`} className="w-28 shrink-0 space-y-1.5">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted">
              {poster ? (
                <Image
                  src={poster}
                  alt={m.title}
                  fill
                  sizes="112px"
                  className="object-cover transition-transform hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">
                  {m.title}
                </div>
              )}
              <span className="absolute left-1.5 top-1.5 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur">
                #{i + 1}
              </span>
              <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur">
                <Star className="size-2.5 fill-primary text-primary" />
                {(m.avg / 2).toFixed(1)}
              </span>
            </div>
            <p className="line-clamp-2 text-xs font-medium leading-tight">{m.title}</p>
          </Link>
        );
      })}
    </div>
  );
}
