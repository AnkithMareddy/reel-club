"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

export type EditRatingResult = { error?: string } | { success: true };

/**
 * Edits one of the caller's own rating entries: score, review text, and (for
 * personal diary entries) the watch date. Works for both club and personal
 * ratings — ownership is checked against the Rating row itself.
 */
export async function updateRatingEntry(input: {
  ratingId: string;
  score: number; // 1–10
  body?: string;
  watchedAt?: string; // yyyy-mm-dd, personal entries only
}): Promise<EditRatingResult> {
  const user = await requireUser();

  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 10) {
    return { error: "Rating must be between 0.5 and 5 stars" };
  }

  const rating = await prisma.rating.findUnique({
    where: { id: input.ratingId },
    include: { watchedMovie: { select: { id: true, loggedById: true } }, movie: { select: { tmdbId: true } } },
  });
  if (!rating || rating.userId !== user.id) return { error: "Rating not found" };

  await prisma.rating.update({ where: { id: rating.id }, data: { score: input.score } });

  const body = input.body?.trim();
  const reviewWhere = {
    userId_watchedMovieId: { userId: user.id, watchedMovieId: rating.watchedMovieId },
  };
  if (body) {
    await prisma.review.upsert({
      where: reviewWhere,
      create: {
        userId: user.id,
        movieId: rating.movieId,
        watchedMovieId: rating.watchedMovieId,
        body,
      },
      update: { body },
    });
  } else {
    await prisma.review.deleteMany({
      where: { userId: user.id, watchedMovieId: rating.watchedMovieId },
    });
  }

  if (input.watchedAt && rating.watchedMovie.loggedById === user.id) {
    const watchedAt = new Date(input.watchedAt);
    if (!Number.isNaN(watchedAt.getTime())) {
      await prisma.watchedMovie.update({
        where: { id: rating.watchedMovieId },
        data: { watchedAt },
      });
    }
  }

  if (user.username) {
    revalidatePath(`/profile/${user.username}`);
    revalidatePath(`/profile/${user.username}/films`);
  }
  revalidatePath(`/movies/${rating.movie.tmdbId}`);
  return { success: true };
}

/**
 * Deletes one of the caller's own personal diary entries (the watch event and
 * its rating/review via cascade). Club watches can't be deleted here — only
 * the rating on them can be edited.
 */
export async function deletePersonalWatchEntry(
  watchedMovieId: string,
): Promise<EditRatingResult> {
  const user = await requireUser();

  const entry = await prisma.watchedMovie.findUnique({
    where: { id: watchedMovieId },
    select: { loggedById: true, movie: { select: { tmdbId: true } } },
  });
  if (!entry || entry.loggedById !== user.id) {
    return { error: "Only your own personal log entries can be deleted" };
  }

  await prisma.watchedMovie.delete({ where: { id: watchedMovieId } });

  if (user.username) {
    revalidatePath(`/profile/${user.username}`);
    revalidatePath(`/profile/${user.username}/films`);
  }
  revalidatePath(`/movies/${entry.movie.tmdbId}`);
  return { success: true };
}
