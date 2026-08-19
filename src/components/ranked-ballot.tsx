"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { submitVote } from "@/lib/actions/voting";
import { tmdbPosterUrl } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BallotMovie = {
  nominationId: string;
  title: string;
  posterPath: string | null;
};

export function RankedBallot({
  clubId,
  cycleId,
  movies,
  initialRanking,
}: {
  clubId: string;
  cycleId: string;
  movies: BallotMovie[];
  /** Nomination ids in the user's previously-saved rank order, if any. */
  initialRanking: string[];
}) {
  const [ranking, setRanking] = useState<string[]>(initialRanking);
  const [pending, startTransition] = useTransition();

  function toggle(nominationId: string) {
    setRanking((prev) =>
      prev.includes(nominationId)
        ? prev.filter((id) => id !== nominationId)
        : [...prev, nominationId],
    );
  }

  function submit() {
    if (ranking.length === 0) {
      toast.error("Rank at least one movie before submitting");
      return;
    }
    startTransition(async () => {
      const result = await submitVote(
        clubId,
        cycleId,
        ranking.map((nominationId, i) => ({ nominationId, rank: i + 1 })),
      );
      if ("error" in result) toast.error(result.error);
      else toast.success("Ballot submitted");
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click movies in order of preference — your first click is your #1 pick. Click again to
        remove a movie from your ballot.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {movies.map((movie) => {
          const rankIndex = ranking.indexOf(movie.nominationId);
          const poster = tmdbPosterUrl(movie.posterPath);
          return (
            <button
              key={movie.nominationId}
              type="button"
              onClick={() => toggle(movie.nominationId)}
              className="space-y-1.5 text-left"
            >
              <div
                className={cn(
                  "relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted ring-2 ring-transparent transition",
                  rankIndex >= 0 && "ring-primary",
                )}
              >
                {poster ? (
                  <Image
                    src={poster}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 20vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                    {movie.title}
                  </div>
                )}
                {rankIndex >= 0 && (
                  <div className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {rankIndex + 1}
                  </div>
                )}
              </div>
              <p className="line-clamp-1 text-sm font-medium leading-tight">{movie.title}</p>
            </button>
          );
        })}
      </div>

      <Button onClick={submit} disabled={pending}>
        {pending ? "Submitting…" : "Submit ballot"}
      </Button>
    </div>
  );
}
