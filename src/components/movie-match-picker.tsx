"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { tmdbPosterUrl, type TmdbSearchResult } from "@/lib/tmdb";

/** Compact inline search used to fix a mismatched or unmatched movie during bulk import. */
export function MovieMatchPicker({
  defaultQuery,
  onPick,
}: {
  defaultQuery: string;
  onPick: (movie: TmdbSearchResult) => void;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    const t = setTimeout(async () => {
      if (!q) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!cancelled) setResults((data.results ?? []).slice(0, 6));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for the right movie…"
        className="h-8 text-sm"
      />
      {loading && <p className="text-xs text-muted-foreground">Searching…</p>}
      <div className="space-y-1">
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onPick(r)}
            className="flex w-full items-center gap-2 rounded-md p-1.5 text-left text-sm hover:bg-muted"
          >
            <div className="relative h-9 w-6 shrink-0 overflow-hidden rounded bg-muted">
              {tmdbPosterUrl(r.poster_path, "w92") ? (
                <Image
                  src={tmdbPosterUrl(r.poster_path, "w92")!}
                  alt=""
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <span className="flex-1 truncate">{r.title}</span>
            <span className="text-xs text-muted-foreground">
              {r.release_date?.slice(0, 4) ?? "—"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
