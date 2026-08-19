"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCacheMovie } from "@/lib/movies";

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

const MAX_BATCH = 100;

export type ImportEntryInput = {
  tmdbId: number;
  watchedAt: string; // yyyy-mm-dd
  score: number | null; // 1–10, null = watched but unrated
};

export type ImportResult = { imported: number; skipped: number; error?: string };

/**
 * Self-service personal import (e.g. from Letterboxd). Every entry is owned
 * by the signed-in user and never touches a club's leaderboard/stats.
 * Call in batches of up to 100 rows from the client to stay well within
 * serverless function time limits on large histories.
 */
export async function importPersonalWatchHistory(
  entries: ImportEntryInput[],
): Promise<ImportResult> {
  const user = await requireUser();
  if (entries.length === 0) return { imported: 0, skipped: 0 };
  if (entries.length > MAX_BATCH) {
    return { imported: 0, skipped: 0, error: `Import in batches of ${MAX_BATCH} or fewer` };
  }

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    const watchedAt = new Date(entry.watchedAt);
    if (Number.isNaN(watchedAt.getTime())) {
      skipped++;
      continue;
    }

    let movie;
    try {
      movie = await getOrCacheMovie(entry.tmdbId);
    } catch {
      skipped++;
      continue;
    }

    const existing = await prisma.watchedMovie.findFirst({
      where: {
        loggedById: user.id,
        movieId: movie.id,
        watchedAt,
        source: "LETTERBOXD_IMPORT",
      },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const watchedMovie = await prisma.watchedMovie.create({
      data: { movieId: movie.id, loggedById: user.id, source: "LETTERBOXD_IMPORT", watchedAt },
    });

    if (entry.score != null) {
      await prisma.rating.create({
        data: { userId: user.id, movieId: movie.id, watchedMovieId: watchedMovie.id, score: entry.score },
      });
    }
    imported++;
  }

  if (user.username) revalidatePath(`/profile/${user.username}`);
  return { imported, skipped };
}

export type BackfillEntryInput = {
  tmdbId: number;
  watchedAt: string; // yyyy-mm-dd
  ratings: { username: string; score: number }[];
};

/**
 * Club-admin historical backfill: creates a club-scoped WatchedMovie (no
 * cycle) plus ratings for whichever members are matched by username, so it
 * counts toward that club's stats/leaderboard like a normal watched movie.
 */
export async function backfillClubWatchHistory(
  clubId: string,
  entries: BackfillEntryInput[],
): Promise<ImportResult> {
  const userId = (await requireUser()).id;
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership || membership.role !== "ADMIN") {
    return { imported: 0, skipped: 0, error: "Only the club admin can backfill history" };
  }
  if (entries.length === 0) return { imported: 0, skipped: 0 };
  if (entries.length > MAX_BATCH) {
    return { imported: 0, skipped: 0, error: `Import in batches of ${MAX_BATCH} or fewer` };
  }

  const members = await prisma.clubMembership.findMany({
    where: { clubId },
    include: { user: { select: { id: true, username: true } } },
  });
  const memberByUsername = new Map(
    members.map((m) => [m.user.username?.toLowerCase(), m.user.id]),
  );

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    const watchedAt = new Date(entry.watchedAt);
    if (Number.isNaN(watchedAt.getTime())) {
      skipped++;
      continue;
    }

    let movie;
    try {
      movie = await getOrCacheMovie(entry.tmdbId);
    } catch {
      skipped++;
      continue;
    }

    const existing = await prisma.watchedMovie.findFirst({
      where: { clubId, movieId: movie.id, watchedAt, source: "ADMIN_BACKFILL" },
    });
    const watchedMovie =
      existing ??
      (await prisma.watchedMovie.create({
        data: { clubId, movieId: movie.id, source: "ADMIN_BACKFILL", watchedAt },
      }));

    for (const r of entry.ratings) {
      const memberId = memberByUsername.get(r.username.toLowerCase());
      if (!memberId) {
        skipped++;
        continue;
      }
      await prisma.rating.upsert({
        where: { userId_watchedMovieId: { userId: memberId, watchedMovieId: watchedMovie.id } },
        create: { userId: memberId, clubId, movieId: movie.id, watchedMovieId: watchedMovie.id, score: r.score },
        update: { score: r.score },
      });
      imported++;
    }
  }

  revalidatePath(`/clubs/${clubId}`);
  revalidatePath(`/clubs/${clubId}/leaderboard`);
  revalidatePath(`/clubs/${clubId}/stats`);
  return { imported, skipped };
}
