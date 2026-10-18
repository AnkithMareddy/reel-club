"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tmdbPosterUrl } from "@/lib/tmdb";

export type FilmographyEntry = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  year: number | null;
  role: string; // "as Neo" / "Director"
  department: "Acting" | "Directing" | "Other";
  voteAverage: number;
  voteCount: number;
  myScore: number | null;
};

const ALL = "__all__";

const SORTS = {
  newest: { label: "Newest first", fn: (a: FilmographyEntry, b: FilmographyEntry) => (b.year ?? 0) - (a.year ?? 0) },
  oldest: { label: "Oldest first", fn: (a: FilmographyEntry, b: FilmographyEntry) => (a.year ?? 9999) - (b.year ?? 9999) },
  popular: { label: "Most popular", fn: (a: FilmographyEntry, b: FilmographyEntry) => b.voteCount - a.voteCount },
  rating: { label: "TMDB rating", fn: (a: FilmographyEntry, b: FilmographyEntry) => b.voteAverage - a.voteAverage },
} as const;

export function PersonFilmographyClient({ entries }: { entries: FilmographyEntry[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [sort, setSort] = useState<keyof typeof SORTS>("popular");

  const departments = useMemo(
    () => [...new Set(entries.map((e) => e.department))].sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (q && !e.title.toLowerCase().includes(q)) return false;
        if (department !== ALL && e.department !== department) return false;
        return true;
      })
      .sort(SORTS[sort].fn);
  }, [entries, query, department, sort]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search their films…"
            className="w-full pl-8 sm:w-52"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {departments.length > 1 && (
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All roles</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={sort} onValueChange={(v) => setSort(v as keyof typeof SORTS)}>
          <SelectTrigger className="w-full sm:w-[150px]">
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
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {entries.length} film{entries.length === 1 ? "" : "s"}
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtered.map((e) => (
          <Link key={`${e.tmdbId}-${e.role}`} href={`/movies/${e.tmdbId}`} className="group space-y-1.5">
            <div className="poster-glow relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
              {tmdbPosterUrl(e.posterPath) ? (
                <Image
                  src={tmdbPosterUrl(e.posterPath)!}
                  alt={e.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 20vw"
                  className="object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                  {e.title}
                </div>
              )}
              {e.myScore != null && (
                <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur">
                  <Star className="size-2.5 fill-primary text-primary" />
                  {(e.myScore / 2).toFixed(1)}
                </span>
              )}
            </div>
            <p className="line-clamp-1 text-sm font-medium leading-tight">{e.title}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {e.year ?? "—"} · {e.role}
            </p>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing matches those filters.
        </p>
      )}
    </div>
  );
}
