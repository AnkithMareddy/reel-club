"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { nominateMovie } from "@/lib/actions/nominations";
import { MovieSearchGrid } from "@/components/movie-search-grid";
import type { TmdbSearchResult } from "@/lib/tmdb";

export function NominateMovieSearch({
  clubId,
  cycleId,
  disabledTmdbIds,
  remaining,
}: {
  clubId: string;
  cycleId: string;
  disabledTmdbIds: number[];
  remaining: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSelect(movie: TmdbSearchResult) {
    if (remaining <= 0) {
      toast.error("You've used all your nominations for this cycle");
      return;
    }
    startTransition(async () => {
      const result = await nominateMovie(clubId, cycleId, movie.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Nominated ${movie.title}`);
        router.refresh();
      }
    });
  }

  return (
    <div className={pending ? "pointer-events-none opacity-60" : undefined}>
      <MovieSearchGrid onSelect={handleSelect} disabledIds={new Set(disabledTmdbIds)} />
    </div>
  );
}
