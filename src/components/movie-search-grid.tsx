"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { tmdbPosterUrl, type TmdbSearchResult } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

type PersonResult = {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string | null;
  known_for: string[];
};

export function MovieSearchGrid({
  onSelect,
  disabledIds,
  showPeople,
}: {
  /** If provided, clicking a result calls this instead of navigating to the movie page. */
  onSelect?: (movie: TmdbSearchResult) => void;
  /** TMDB ids to render as disabled (e.g. already nominated this cycle). */
  disabledIds?: Set<number>;
  /** Also search actors/directors and show them above the movie results. */
  showPeople?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced) return;
    let cancelled = false;

    async function run() {
      setStatus("loading");
      try {
        const res = await fetch(
          `/api/movies/search?q=${encodeURIComponent(debounced)}&page=${page}`,
        );
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        if (cancelled) return;
        setResults(data.results ?? []);
        setTotalPages(data.total_pages ?? 0);
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    run();

    return () => {
      cancelled = true;
    };
  }, [debounced, page]);

  useEffect(() => {
    if (!showPeople) return;
    let cancelled = false;

    async function run() {
      if (!debounced) {
        setPeople([]);
        return;
      }
      try {
        const res = await fetch(`/api/people/search?q=${encodeURIComponent(debounced)}`);
        if (!res.ok) throw new Error("person search failed");
        const data = await res.json();
        if (!cancelled) setPeople(data.results ?? []);
      } catch {
        if (!cancelled) setPeople([]);
      }
    }
    run();

    return () => {
      cancelled = true;
    };
  }, [debounced, showPeople]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={showPeople ? "Search movies, actors, directors…" : "Search for a movie…"}
          className="pl-8"
        />
      </div>

      {showPeople && people.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">People</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {people.map((p) => (
              <Link
                key={p.id}
                href={`/people/${p.id}`}
                className="w-20 shrink-0 space-y-1 text-center"
              >
                <div className="relative mx-auto size-20 overflow-hidden rounded-full bg-muted">
                  {tmdbPosterUrl(p.profile_path, "w185") ? (
                    <Image
                      src={tmdbPosterUrl(p.profile_path, "w185")!}
                      alt={p.name}
                      fill
                      sizes="80px"
                      className="object-cover transition-transform hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="line-clamp-2 text-xs font-medium leading-tight">{p.name}</p>
                <p className="line-clamp-1 text-[10px] text-muted-foreground">
                  {p.known_for_department ?? p.known_for.join(", ")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {status === "loading" && debounced && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full" />
          ))}
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-destructive">Search failed — try again in a moment.</p>
      )}

      {status === "idle" && debounced && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No movies found for &quot;{debounced}&quot;.</p>
      )}

      {status === "idle" && debounced && results.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {results.map((movie) => {
              const poster = tmdbPosterUrl(movie.poster_path);
              const year = movie.release_date ? movie.release_date.slice(0, 4) : "—";
              const disabled = disabledIds?.has(movie.id) ?? false;
              const card = (
                <div
                  className={cn(
                    "group space-y-1.5",
                    disabled ? "pointer-events-none opacity-50" : "cursor-pointer",
                  )}
                >
                  <div className="poster-glow relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={movie.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 20vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                        {movie.title}
                      </div>
                    )}
                    {movie.my_score != null && (
                      <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur">
                        <Star className="size-2.5 fill-primary text-primary" />
                        {(movie.my_score / 2).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-1 text-sm font-medium leading-tight">{movie.title}</p>
                  <p className="text-xs text-muted-foreground">{year}</p>
                </div>
              );

              if (onSelect) {
                return (
                  <button
                    key={movie.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(movie)}
                    className="text-left"
                  >
                    {card}
                  </button>
                );
              }
              return (
                <Link key={movie.id} href={`/movies/${movie.id}`}>
                  {card}
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.min(totalPages, 500)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
