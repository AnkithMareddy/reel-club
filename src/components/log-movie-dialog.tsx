"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { logMovie } from "@/lib/actions/personal-log";
import { MovieSearchGrid } from "@/components/movie-search-grid";
import { StarRatingInput } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { tmdbPosterUrl, type TmdbSearchResult } from "@/lib/tmdb";

function todayLocal() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function LogMovieDialog() {
  const [open, setOpen] = useState(false);
  const [movie, setMovie] = useState<TmdbSearchResult | null>(null);
  const [score, setScore] = useState(0);
  const [watchedAt, setWatchedAt] = useState(todayLocal());
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function reset() {
    setMovie(null);
    setScore(0);
    setWatchedAt(todayLocal());
    setBody("");
  }

  function handleSubmit() {
    if (!movie || score === 0) return;
    startTransition(async () => {
      const result = await logMovie({ tmdbId: movie.id, score, watchedAt, body });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Logged ${movie.title}`);
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Log a movie
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Log a movie</DialogTitle>
          <DialogDescription>
            Rate and review anything you&apos;ve watched — no club required.
          </DialogDescription>
        </DialogHeader>

        {!movie ? (
          <MovieSearchGrid onSelect={setMovie} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded bg-muted">
                {tmdbPosterUrl(movie.poster_path, "w185") ? (
                  <Image
                    src={tmdbPosterUrl(movie.poster_path, "w185")!}
                    alt={movie.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium leading-tight">{movie.title}</p>
                <p className="text-xs text-muted-foreground">
                  {movie.release_date ? movie.release_date.slice(0, 4) : "—"}
                </p>
                <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => setMovie(null)}>
                  Change movie
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Your rating</Label>
              <StarRatingInput value={score} onChange={setScore} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="watchedAt">Date watched</Label>
              <Input
                id="watchedAt"
                type="date"
                max={todayLocal()}
                value={watchedAt}
                onChange={(e) => setWatchedAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="log-body">Review (optional)</Label>
              <Textarea
                id="log-body"
                rows={4}
                maxLength={2000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" disabled={pending || score === 0} onClick={handleSubmit}>
                {pending ? "Saving…" : "Save to your diary"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
