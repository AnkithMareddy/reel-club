import { prisma } from "@/lib/prisma";
import { getMovieDetails } from "@/lib/tmdb";
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
          create: { tmdbId: d.id, name: d.name },
        })),
      },
    },
    ...movieWithRelations,
  });
}
