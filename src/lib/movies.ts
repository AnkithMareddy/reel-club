import { prisma } from "@/lib/prisma";
import { getMovieDetails, getPersonProfilePath } from "@/lib/tmdb";
import { getImdbRating } from "@/lib/omdb";

const movieWithRelations = {
  include: { genres: true, directors: true },
} as const;

/**
 * Returns the cached Movie row for a TMDB id, fetching and caching it from
 * TMDB/OMDb on first view so repeat visits never re-hit either API.
 */
export async function getOrCacheMovie(tmdbId: number) {
  const existing = await prisma.movie.findUnique({
    where: { tmdbId },
    ...movieWithRelations,
  });
  if (existing) return existing;

  const details = await getMovieDetails(tmdbId);
  const imdbRating = details.imdb_id ? await getImdbRating(details.imdb_id) : null;

  const directors = details.credits.crew
    .filter((c) => c.job === "Director")
    .filter((c, i, arr) => arr.findIndex((d) => d.id === c.id) === i);

  const cast = details.credits.cast
    .slice(0, 12)
    .map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
      order: c.order,
    }));

  return prisma.movie.create({
    data: {
      tmdbId: details.id,
      imdbId: details.imdb_id,
      title: details.title,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      synopsis: details.overview,
      releaseDate: details.release_date ? new Date(details.release_date) : null,
      runtime: details.runtime,
      tmdbRating: details.vote_average,
      imdbRating,
      cast,
      genres: {
        connectOrCreate: details.genres.map((g) => ({
          where: { tmdbId: g.id },
          create: { tmdbId: g.id, name: g.name },
        })),
      },
      directors: {
        connectOrCreate: directors.map((d) => ({
          where: { tmdbId: d.id },
          create: { tmdbId: d.id, name: d.name, profilePath: d.profile_path },
        })),
      },
    },
    ...movieWithRelations,
  });
}

/**
 * One-time lazy photo backfill for directors cached before profilePath
 * existed. Fetches TMDB person profiles for the given directors that are
 * missing a photo and stores the result, so subsequent renders are DB-only.
 */
export async function ensureDirectorPhotos(directorIds: string[]) {
  if (directorIds.length === 0) return;
  const missing = await prisma.director.findMany({
    where: { id: { in: directorIds }, profilePath: null },
    select: { id: true, tmdbId: true },
  });
  await Promise.all(
    missing.map(async (d) => {
      try {
        const profilePath = await getPersonProfilePath(d.tmdbId);
        if (profilePath) {
          await prisma.director.update({ where: { id: d.id }, data: { profilePath } });
        }
      } catch {
        // Photo backfill is best-effort; the initials fallback covers misses.
      }
    }),
  );
}

export type CastMember = {
  id?: number;
  name: string;
  character: string;
  profilePath: string | null;
  order: number;
};

/**
 * Movies cached before cast snapshots carried TMDB person ids can't link to
 * person pages. Refreshes the cast JSON from TMDB once for such movies.
 */
export async function ensureCastIds(movie: {
  id: string;
  tmdbId: number;
  cast: unknown;
}): Promise<CastMember[]> {
  const cast = (movie.cast as CastMember[] | null) ?? [];
  if (cast.length === 0 || cast.every((c) => c.id != null)) return cast;

  try {
    const details = await getMovieDetails(movie.tmdbId);
    const refreshed = details.credits.cast.slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
      order: c.order,
    }));
    await prisma.movie.update({ where: { id: movie.id }, data: { cast: refreshed } });
    return refreshed;
  } catch {
    return cast;
  }
}

/**
 * Backfills TMDB person ids into the cached cast of movies stored before ids
 * were recorded, returning the refreshed casts by movie id. Capped per call so
 * a big library converges over a few page loads instead of firing hundreds of
 * TMDB requests at once.
 */
export async function backfillCastIds(
  movies: { id: string; tmdbId: number; cast: unknown }[],
  limit = 12,
): Promise<Map<string, CastMember[]>> {
  const stale = movies
    .filter((m) => {
      const cast = (m.cast as CastMember[] | null) ?? [];
      return cast.length > 0 && cast.some((c) => c.id == null);
    })
    .slice(0, limit);

  const updated = new Map<string, CastMember[]>();
  await Promise.all(
    stale.map(async (m) => {
      const refreshed = await ensureCastIds(m);
      if (refreshed.some((c) => c.id != null)) updated.set(m.id, refreshed);
    }),
  );
  return updated;
}
