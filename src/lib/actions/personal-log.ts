"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCacheMovie } from "@/lib/movies";
import { logActivity } from "@/lib/activity";

async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true },
  });
  if (!user) redirect("/");
  return user;
}

export type LogMovieResult = { error?: string } | { success: true };

/**
 * Personal, Letterboxd-style diary entry: rate/review a movie independent of
 * any club cycle. Supports rewatches — no uniqueness constraint on movie.
 */
export async function logMovie(input: {
  tmdbId: number;
  score: number; // 1–10
  watchedAt: string; // yyyy-mm-dd
  body?: string;
  visibility?: "CLUB_AND_FRIENDS" | "CLUB_ONLY";
}): Promise<LogMovieResult> {
  const user = await requireUser();

  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 10) {
    return { error: "Rating must be between 0.5 and 5 stars" };
  }
  const watchedAt = new Date(input.watchedAt);
  if (Number.isNaN(watchedAt.getTime())) return { error: "Invalid watch date" };
  if (watchedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return { error: "Watch date can't be in the future" };
  }

  const movie = await getOrCacheMovie(input.tmdbId);

  const watchedMovie = await prisma.watchedMovie.create({
    data: {
      movieId: movie.id,
      loggedById: user.id,
      source: "PERSONAL_LOG",
      watchedAt,
    },
  });

  await prisma.rating.create({
    data: { userId: user.id, movieId: movie.id, watchedMovieId: watchedMovie.id, score: input.score },
  });

  const body = input.body?.trim();
  if (body) {
    await prisma.review.create({
      data: {
        userId: user.id,
        movieId: movie.id,
        watchedMovieId: watchedMovie.id,
        body,
        visibility: input.visibility ?? "CLUB_AND_FRIENDS",
      },
    });
  }

  await logActivity({
    userId: user.id,
    type: "RATED_MOVIE",
    movieId: movie.id,
    targetId: watchedMovie.id,
    metadata: { score: input.score, title: movie.title, posterPath: movie.posterPath, personal: true },
  });

  if (user.username) revalidatePath(`/profile/${user.username}`);
  revalidatePath(`/movies/${movie.tmdbId}`);
  return { success: true };
}
