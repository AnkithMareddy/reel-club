import { prisma } from "@/lib/prisma";
import { ensureDirectorPhotos, backfillCastIds, type CastMember } from "@/lib/movies";
import { dedupeRatingsByMovie } from "@/lib/dedupe-ratings";

type RatingForStats = {
  score: number;
  movie: {
    id: string;
    tmdbId: number;
    title: string;
    posterPath: string | null;
    releaseDate: Date | null;
    runtime: number | null;
    cast: unknown;
    genres: { id: string; name: string }[];
    directors: { id: string; name: string; profilePath: string | null; tmdbId: number }[];
  };
};

/** A movie inside a chart segment, so any bar can be drilled into. */
export type SegmentMovie = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  score: number; // 1-10
};

export type NamedStat = {
  id: string;
  name: string;
  count: number;
  avg: number;
  movies: SegmentMovie[];
};

export type DirectorStat = NamedStat & { profilePath: string | null; tmdbId: number };

/** Same shape as DirectorStat; `id` is the TMDB person id as a string. */
export type ActorStat = DirectorStat;

export type TopMovie = {
  movieId: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  avg: number; // 1-10 scale
  count: number;
};

export type ComputedStats = {
  totalMovies: number;
  avgRating: number; // 1-10 scale
  distribution: { score: number; count: number; movies: SegmentMovie[] }[]; // score 1..10
  topMovies: TopMovie[];
  genresByCount: NamedStat[];
  genresByAvg: NamedStat[];
  directorsByCount: DirectorStat[];
  actorsByCount: ActorStat[];
  decades: NamedStat[]; // name = "1990s"
  runtimeBuckets: NamedStat[]; // name = "Under 90 min" etc.
};

const RUNTIME_BUCKETS: [string, (min: number) => boolean][] = [
  ["Under 90 min", (m) => m < 90],
  ["90–120 min", (m) => m >= 90 && m < 120],
  ["120–150 min", (m) => m >= 120 && m < 150],
  ["150+ min", (m) => m >= 150],
];

type TallyEntry = { id: string; name: string; score: number; movie: SegmentMovie };

function tally(entries: TallyEntry[]): NamedStat[] {
  const map = new Map<string, { name: string; count: number; total: number; movies: SegmentMovie[] }>();
  for (const e of entries) {
    const existing = map.get(e.id) ?? { name: e.name, count: 0, total: 0, movies: [] };
    existing.count += 1;
    existing.total += e.score;
    existing.movies.push(e.movie);
    map.set(e.id, existing);
  }
  return [...map.entries()].map(([id, v]) => ({
    id,
    name: v.name,
    count: v.count,
    avg: v.total / v.count,
    movies: [...v.movies].sort((a, b) => b.score - a.score),
  }));
}

export function computeStats(ratings: RatingForStats[]): ComputedStats {
  const totalMovies = ratings.length;
  const avgRating = totalMovies ? ratings.reduce((s, r) => s + r.score, 0) / totalMovies : 0;

  const distribution = Array.from({ length: 10 }, (_, i) => {
    const bucket = ratings.filter((r) => r.score === i + 1);
    return {
      score: i + 1,
      count: bucket.length,
      movies: bucket.map((r) => ({
        tmdbId: r.movie.tmdbId,
        title: r.movie.title,
        posterPath: r.movie.posterPath,
        score: r.score,
      })),
    };
  });

  const movieAgg = new Map<
    string,
    { movie: RatingForStats["movie"]; total: number; count: number }
  >();
  for (const r of ratings) {
    const existing = movieAgg.get(r.movie.id) ?? { movie: r.movie, total: 0, count: 0 };
    existing.total += r.score;
    existing.count += 1;
    movieAgg.set(r.movie.id, existing);
  }
  const topMovies: TopMovie[] = [...movieAgg.values()]
    .map(({ movie, total, count }) => ({
      movieId: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      posterPath: movie.posterPath,
      avg: total / count,
      count,
    }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count);

  const segmentMovie = (r: RatingForStats): SegmentMovie => ({
    tmdbId: r.movie.tmdbId,
    title: r.movie.title,
    posterPath: r.movie.posterPath,
    score: r.score,
  });

  const genreEntries = ratings.flatMap((r) =>
    r.movie.genres.map((g) => ({ id: g.id, name: g.name, score: r.score, movie: segmentMovie(r) })),
  );
  const genreStats = tally(genreEntries);

  const directorEntries = ratings.flatMap((r) =>
    r.movie.directors.map((d) => ({
      id: d.id,
      name: d.name,
      score: r.score,
      movie: segmentMovie(r),
    })),
  );
  const directorMetaById = new Map(
    ratings.flatMap((r) =>
      r.movie.directors.map((d) => [d.id, { profilePath: d.profilePath, tmdbId: d.tmdbId }] as const),
    ),
  );
  const directorStats: DirectorStat[] = tally(directorEntries).map((d) => ({
    ...d,
    profilePath: directorMetaById.get(d.id)?.profilePath ?? null,
    tmdbId: directorMetaById.get(d.id)?.tmdbId ?? 0,
  }));

  const actorEntries = ratings.flatMap((r) => {
    const cast = ((r.movie.cast as CastMember[] | null) ?? []).filter((c) => c.id != null);
    // Only the billed leads, so a big ensemble doesn't swamp the ranking.
    return cast.slice(0, 5).map((c) => ({
      id: String(c.id),
      name: c.name,
      score: r.score,
      movie: segmentMovie(r),
    }));
  });
  const actorPhotoById = new Map(
    ratings.flatMap((r) =>
      ((r.movie.cast as CastMember[] | null) ?? [])
        .filter((c) => c.id != null)
        .map((c) => [String(c.id), c.profilePath] as const),
    ),
  );
  const actorStats: ActorStat[] = tally(actorEntries).map((a) => ({
    ...a,
    profilePath: actorPhotoById.get(a.id) ?? null,
    tmdbId: Number(a.id),
  }));

  const decadeEntries = ratings
    .filter((r) => r.movie.releaseDate)
    .map((r) => {
      const year = r.movie.releaseDate!.getFullYear();
      const decade = Math.floor(year / 10) * 10;
      return { id: String(decade), name: `${decade}s`, score: r.score, movie: segmentMovie(r) };
    });
  const decadeStats = tally(decadeEntries).sort((a, b) => Number(a.id) - Number(b.id));

  const runtimeEntries = ratings
    .filter((r) => r.movie.runtime)
    .map((r) => {
      const bucket = RUNTIME_BUCKETS.find(([, test]) => test(r.movie.runtime!));
      const name = bucket?.[0] ?? "Unknown";
      return { id: name, name, score: r.score, movie: segmentMovie(r) };
    });
  const runtimeStats = tally(runtimeEntries).sort(
    (a, b) => RUNTIME_BUCKETS.findIndex((b2) => b2[0] === a.name) - RUNTIME_BUCKETS.findIndex((b2) => b2[0] === b.name),
  );

  return {
    totalMovies,
    avgRating,
    distribution,
    topMovies,
    genresByCount: [...genreStats].sort((a, b) => b.count - a.count),
    genresByAvg: [...genreStats].filter((g) => g.count >= 2).sort((a, b) => b.avg - a.avg),
    directorsByCount: [...directorStats].sort((a, b) => b.count - a.count),
    actorsByCount: [...actorStats].sort((a, b) => b.count - a.count || b.avg - a.avg),
    decades: decadeStats,
    runtimeBuckets: runtimeStats,
  };
}

const ratingSelect = {
  score: true,
  userId: true,
  movieId: true,
  updatedAt: true,
  watchedMovie: { select: { source: true, watchedAt: true } },
  movie: {
    select: {
      id: true,
      tmdbId: true,
      title: true,
      posterPath: true,
      releaseDate: true,
      runtime: true,
      cast: true,
      genres: { select: { id: true, name: true } },
      directors: { select: { id: true, name: true, profilePath: true, tmdbId: true } },
    },
  },
} as const;

// Backfills photos for the directors that will actually be displayed, then
// re-reads them so the stats carry the freshly stored paths.
async function withDirectorPhotos(stats: ComputedStats): Promise<ComputedStats> {
  const shown = stats.directorsByCount.slice(0, 8);
  const missing = shown.filter((d) => !d.profilePath);
  if (missing.length === 0) return stats;

  await ensureDirectorPhotos(missing.map((d) => d.id));
  const refreshed = await prisma.director.findMany({
    where: { id: { in: missing.map((d) => d.id) } },
    select: { id: true, profilePath: true },
  });
  const photoById = new Map(refreshed.map((d) => [d.id, d.profilePath]));
  return {
    ...stats,
    directorsByCount: stats.directorsByCount.map((d) => ({
      ...d,
      profilePath: d.profilePath ?? photoById.get(d.id) ?? null,
    })),
  };
}

/**
 * Movies cached before cast person-ids existed would otherwise be invisible to
 * the actor ranking, so top up a few per load and use the refreshed casts.
 */
async function withCastIds<T extends { movie: { id: string; tmdbId: number; cast: unknown } }>(
  ratings: T[],
): Promise<T[]> {
  const uniqueMovies = [...new Map(ratings.map((r) => [r.movie.id, r.movie])).values()];
  const updated = await backfillCastIds(uniqueMovies);
  if (updated.size === 0) return ratings;
  return ratings.map((r) =>
    updated.has(r.movie.id) ? { ...r, movie: { ...r.movie, cast: updated.get(r.movie.id) } } : r,
  );
}

export async function getUserStats(userId: string, clubId?: string) {
  const ratings = await prisma.rating.findMany({
    where: { userId, ...(clubId ? { clubId } : {}) },
    select: ratingSelect,
  });
  return withDirectorPhotos(computeStats(await withCastIds(dedupeRatingsByMovie(ratings))));
}

export async function getClubStats(clubId: string) {
  const ratings = await prisma.rating.findMany({
    where: { clubId },
    select: ratingSelect,
  });
  return withDirectorPhotos(computeStats(await withCastIds(dedupeRatingsByMovie(ratings))));
}
