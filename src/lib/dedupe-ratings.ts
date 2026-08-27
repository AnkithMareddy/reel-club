type WatchSource = "CLUB_CYCLE" | "PERSONAL_LOG" | "LETTERBOXD_IMPORT" | "ADMIN_BACKFILL";

type DedupableRating = {
  userId?: string;
  movieId: string;
  updatedAt?: Date;
  watchedMovie: { source: WatchSource; watchedAt: Date };
};

/**
 * A member's own rating outranks one recorded through a club cycle: if you
 * logged a movie yourself (or imported it from Letterboxd) that score is the
 * one you actually stand behind.
 */
const SOURCE_RANK: Record<WatchSource, number> = {
  PERSONAL_LOG: 0,
  LETTERBOXD_IMPORT: 1,
  CLUB_CYCLE: 2,
  ADMIN_BACKFILL: 3,
};

/**
 * Collapses a user's ratings to one per movie.
 *
 * The same film can be rated more than once — watched with a club and also
 * imported from Letterboxd, or simply rewatched — which would otherwise
 * double-count it in stats and show it twice in a rating history. Prefers the
 * personal rating, then the most recent watch.
 */
export function dedupeRatingsByMovie<T extends DedupableRating>(ratings: T[]): T[] {
  const best = new Map<string, T>();

  for (const rating of ratings) {
    // Ratings from different members are independent; only collapse per user.
    const key = `${rating.userId ?? ""}|${rating.movieId}`;
    const current = best.get(key);
    if (!current) {
      best.set(key, rating);
      continue;
    }

    const rank = SOURCE_RANK[rating.watchedMovie.source];
    const currentRank = SOURCE_RANK[current.watchedMovie.source];
    if (rank !== currentRank) {
      if (rank < currentRank) best.set(key, rating);
      continue;
    }
    if (rating.watchedMovie.watchedAt > current.watchedMovie.watchedAt) {
      best.set(key, rating);
    }
  }

  return [...best.values()];
}

/** How many separate entries exist per movie, for "rewatch" hints in the UI. */
export function countEntriesByMovie<T extends DedupableRating>(ratings: T[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of ratings) counts.set(r.movieId, (counts.get(r.movieId) ?? 0) + 1);
  return counts;
}
