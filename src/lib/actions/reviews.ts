"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

async function requireUserId() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return session.user.id;
}

const schema = z.object({
  score: z.coerce.number().int().min(1).max(10),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
  containsSpoilers: z.coerce.boolean().optional(),
  visibility: z.enum(["CLUB_AND_FRIENDS", "CLUB_ONLY"]),
});

export type RatingFormState = { error?: string } | undefined;

export async function submitRatingAndReview(
  clubId: string,
  watchedMovieId: string,
  _prevState: RatingFormState,
  formData: FormData,
): Promise<RatingFormState> {
  const userId = await requireUserId();

  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) return { error: "You're not a member of this club" };

  const watchedMovie = await prisma.watchedMovie.findUnique({
    where: { id: watchedMovieId },
    include: { movie: { select: { id: true, tmdbId: true } } },
  });
  if (!watchedMovie || watchedMovie.clubId !== clubId) {
    return { error: "That watch entry wasn't found" };
  }

  const parsed = schema.safeParse({
    score: formData.get("score"),
    body: formData.get("body"),
    containsSpoilers: formData.get("containsSpoilers") === "on",
    visibility: formData.get("visibility") ?? "CLUB_AND_FRIENDS",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const [existingRating, existingReview] = await Promise.all([
    prisma.rating.findUnique({ where: { userId_watchedMovieId: { userId, watchedMovieId } } }),
    prisma.review.findUnique({ where: { userId_watchedMovieId: { userId, watchedMovieId } } }),
  ]);

  await prisma.rating.upsert({
    where: { userId_watchedMovieId: { userId, watchedMovieId } },
    create: {
      userId,
      clubId,
      movieId: watchedMovie.movieId,
      watchedMovieId,
      score: data.score,
    },
    update: { score: data.score },
  });

  if (data.body) {
    await prisma.review.upsert({
      where: { userId_watchedMovieId: { userId, watchedMovieId } },
      create: {
        userId,
        movieId: watchedMovie.movieId,
        watchedMovieId,
        body: data.body,
        containsSpoilers: data.containsSpoilers ?? false,
        visibility: data.visibility,
      },
      update: {
        body: data.body,
        containsSpoilers: data.containsSpoilers ?? false,
        visibility: data.visibility,
      },
    });
  }

  if (!existingRating) {
    await logActivity({
      userId,
      type: "RATED_MOVIE",
      clubId,
      movieId: watchedMovie.movieId,
      metadata: { score: data.score },
    });
  }
  if (data.body && !existingReview) {
    await logActivity({
      userId,
      type: "REVIEWED_MOVIE",
      clubId,
      movieId: watchedMovie.movieId,
      targetId: watchedMovieId,
    });
  }

  revalidatePath(`/clubs/${clubId}/watch/${watchedMovieId}`);
  revalidatePath(`/movies/${watchedMovie.movie.tmdbId}`);
  return undefined;
}
