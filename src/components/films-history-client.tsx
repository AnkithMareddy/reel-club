"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { StarRatingDisplay } from "@/components/star-rating";
import { EditRatingDialog } from "@/components/edit-rating-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tmdbPosterUrl } from "@/lib/tmdb";

export type FilmRow = {
  ratingId: string;
  watchedMovieId: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  year: number | null;
  genres: string[];
  directors: string[];
  score: number; // 1–10
  body: string;
  watchedAt: string; // yyyy-mm-dd
  isPersonal: boolean;
};

const ALL = "__all__";

const SORTS = {
  recent: { label: "Recently watched", fn: (a: FilmRow, b: FilmRow) => b.watchedAt.localeCompare(a.watchedAt) },
  "rating-desc": { label: "Highest rated", fn: (a: FilmRow, b: FilmRow) => b.score - a.score },
  "rating-asc": { label: "Lowest rated", fn: (a: FilmRow, b: FilmRow) => a.score - b.score },
  title: { label: "Title A–Z", fn: (a: FilmRow, b: FilmRow) => a.title.localeCompare(b.title) },
} as const;

export function FilmsHistoryClient({ rows, editable }: { rows: FilmRow[]; editable: boolean }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState(ALL);
  const [director, setDirector] = useState(ALL);
  const [decade, setDecade] = useState(ALL);
  const [minStars, setMinStars] = useState(ALL);
  const [sort, setSort] = useState<keyof typeof SORTS>("recent");

  const genres = useMemo(
    () => [...new Set(rows.flatMap((r) => r.genres))].sort(),
    [rows],
  );
  const directors = useMemo(
    () => [...new Set(rows.flatMap((r) => r.directors))].sort(),
    [rows],
  );
  const decades = useMemo(
    () =>
      [...new Set(
        rows
          .filter((r) => r.year != null)
          .map((r) => Math.floor(r.year! / 10) * 10),
      )].sort((a, b) => b - a),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (q && !r.title.toLowerCase().includes(q)) return false;
        if (genre !== ALL && !r.genres.includes(genre)) return false;
        if (director !== ALL && !r.directors.includes(director)) return false;
        if (decade !== ALL) {
          if (r.year == null || Math.floor(r.year / 10) * 10 !== Number(decade)) return false;
        }
        if (minStars !== ALL && r.score < Number(minStars)) return false;
        return true;
      })
      .sort(SORTS[sort].fn);
  }, [rows, query, genre, director, decade, minStars, sort]);

  const anyFilter =
    query.trim() !== "" || genre !== ALL || director !== ALL || decade !== ALL || minStars !== ALL;

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No rated movies yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles…"
            className="w-48 pl-8"
          />
        </div>

        <Select value={genre} onValueChange={setGenre}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All genres</SelectItem>
            {genres.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={director} onValueChange={setDirector}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Director" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All directors</SelectItem>
            {directors.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={decade} onValueChange={setDecade}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Decade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All decades</SelectItem>
            {decades.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d}s
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={minStars} onValueChange={setMinStars}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any rating</SelectItem>
            {[9, 8, 7, 6, 5].map((s) => (
              <SelectItem key={s} value={String(s)}>
                {(s / 2).toFixed(1)}★ & up
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as keyof typeof SORTS)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORTS).map(([key, s]) => (
              <SelectItem key={key} value={key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {anyFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setGenre(ALL);
              setDirector(ALL);
              setDecade(ALL);
              setMinStars(ALL);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {rows.length} film{rows.length === 1 ? "" : "s"}
      </p>

      <div className="space-y-2">
        {filtered.map((r) => {
          const poster = tmdbPosterUrl(r.posterPath, "w92");
          return (
            <div
              key={r.ratingId}
              className="flex items-center gap-3 rounded-lg border p-2.5"
            >
              <Link href={`/movies/${r.tmdbId}`} className="shrink-0">
                <div className="relative aspect-[2/3] w-11 overflow-hidden rounded bg-muted">
                  {poster ? (
                    <Image src={poster} alt={r.title} fill sizes="44px" className="object-cover" />
                  ) : null}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <Link
                    href={`/movies/${r.tmdbId}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {r.title}
                  </Link>
                  {r.year && <span className="shrink-0 text-xs text-muted-foreground">{r.year}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {r.genres.slice(0, 3).map((g) => (
                    <Badge key={g} variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {g}
                    </Badge>
                  ))}
                  <span className="text-[11px] text-muted-foreground">
                    Watched {r.watchedAt}
                    {r.body ? " · reviewed" : ""}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <StarRatingDisplay value={r.score} />
                {editable && (
                  <EditRatingDialog
                    entry={{
                      ratingId: r.ratingId,
                      watchedMovieId: r.watchedMovieId,
                      title: r.title,
                      score: r.score,
                      body: r.body,
                      watchedAt: r.watchedAt,
                      isPersonal: r.isPersonal,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing matches those filters.
          </p>
        )}
      </div>
    </div>
  );
}
