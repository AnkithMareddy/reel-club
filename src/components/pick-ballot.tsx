"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { submitVote } from "@/lib/actions/voting";
import { Button } from "@/components/ui/button";
import { tmdbPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

export type BallotMovie = {
  nominationId: string;
  title: string;
  posterPath: string | null;
  /** Your own nominations can't be voted for. */
  isOwnNomination: boolean;
};

/** Approval ballot: tap up to `maxPicks` posters, then submit. */
export function PickBallot({
  clubId,
  cycleId,
  movies,
  maxPicks,
  initialPicks,
}: {
  clubId: string;
  cycleId: string;
  movies: BallotMovie[];
  maxPicks: number;
  initialPicks: string[];
}) {
  const [picks, setPicks] = useState<string[]>(initialPicks);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const hasSubmitted = initialPicks.length > 0;

  function toggle(nominationId: string) {
    const movie = movies.find((m) => m.nominationId === nominationId);
    if (movie?.isOwnNomination) {
      toast.error("You can't vote for a movie you nominated");
      return;
    }
    setPicks((prev) => {
      if (prev.includes(nominationId)) return prev.filter((id) => id !== nominationId);
      if (prev.length >= maxPicks) {
        // At the cap, replace the oldest pick so tapping always does something.
        if (maxPicks === 1) return [nominationId];
        toast.error(`You can pick ${maxPicks} movie${maxPicks === 1 ? "" : "s"}`);
        return prev;
      }
      return [...prev, nominationId];
    });
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitVote(clubId, cycleId, picks);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(hasSubmitted ? "Vote updated" : "Vote submitted");
        router.refresh();
      }
    });
  }

  const votable = movies.filter((m) => !m.isOwnNomination);
  if (movies.length === 0) {
    return <p className="text-sm text-muted-foreground">No nominations to vote on.</p>;
  }
  if (votable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Every movie on this ballot is one you nominated, so there&apos;s nothing for you to vote on
        this round.
      </p>
    );
  }
  const effectiveMax = Math.min(maxPicks, votable.length);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pick {effectiveMax === 1 ? "your favourite" : `up to ${effectiveMax}`} — {picks.length}/
        {effectiveMax} selected. You can&apos;t vote for your own nominations.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {movies.map((m) => {
          const index = picks.indexOf(m.nominationId);
          const selected = index !== -1;
          const poster = tmdbPosterUrl(m.posterPath);
          return (
            <button
              key={m.nominationId}
              type="button"
              aria-pressed={selected}
              disabled={m.isOwnNomination}
              title={m.isOwnNomination ? "You nominated this" : undefined}
              onClick={() => toggle(m.nominationId)}
              className="group space-y-1.5 text-left disabled:cursor-not-allowed"
            >
              <div
                className={cn(
                  "relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted ring-offset-2 ring-offset-background transition-all",
                  selected && "ring-2 ring-primary",
                  m.isOwnNomination && "opacity-35 grayscale",
                  !selected && !m.isOwnNomination && "opacity-80 group-hover:opacity-100",
                )}
              >
                {poster ? (
                  <Image
                    src={poster}
                    alt={m.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                    {m.title}
                  </div>
                )}
                {m.isOwnNomination && (
                  <span className="absolute inset-x-0 bottom-0 bg-background/85 py-1 text-center text-[10px] font-medium backdrop-blur">
                    Your nomination
                  </span>
                )}
                {selected && (
                  <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {maxPicks === 1 ? <Check className="size-3.5" /> : index + 1}
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-sm font-medium leading-tight">{m.title}</p>
            </button>
          );
        })}
      </div>

      <Button type="button" disabled={pending || picks.length === 0} onClick={handleSubmit}>
        {pending ? "Saving…" : hasSubmitted ? "Update my vote" : "Submit vote"}
      </Button>
    </div>
  );
}
