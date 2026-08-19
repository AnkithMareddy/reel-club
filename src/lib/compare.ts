import { prisma } from "@/lib/prisma";

type MovieLite = {
  id: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  genres: { name: string }[];
};

export type SharedMovie = {
  movie: MovieLite;
  mine: number; // 1–10, averaged across rewatches
  theirs: number;
  diff: number; // mine - theirs
};

export type TasteComparison = {
  myCount: number;
  theirCount: number;
  shared: SharedMovie[];
  matchPercent: number | null; // null until there's at least one shared movie
  bothLoved: SharedMovie[];
  disagreements: SharedMovie[]; // largest |diff| first
  iLikedMore: SharedMovie[];
  theyLikedMore: SharedMovie[];
  myTopGenres: { name: string; count: number }[];
  theirTopGenres: { name: string; count: number }[];
  onlyTheirs: { movie: MovieLite; score: number }[]; // their favorites I haven't seen
};

async function perMovieAverages(userId: string) {
  const ratings = await prisma.rating.findMany({
    where: { userId },
    select: {
      score: true,
      movie: {
        select: { id: true, tmdbId: true, title: true, posterPath: true, genres: { select: { name: true } } },
      },
    },
  });
  const byMovie = new Map<string, { movie: MovieLite; total: number; count: number }>();
  for (const r of ratings) {
    const existing = byMovie.get(r.movie.id) ?? { movie: r.movie, total: 0, count: 0 };
    existing.total += r.score;
    existing.count += 1;
    byMovie.set(r.movie.id, existing);
  }
  return new Map(
    [...byMovie.entries()].map(([id, v]) => [id, { movie: v.movie, avg: v.total / v.count }]),
  );
}

function topGenres(movies: { movie: MovieLite }[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const { movie } of movies) {
    for (const g of movie.genres) counts.set(g.name, (counts.get(g.name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function compareTaste(myUserId: string, theirUserId: string): Promise<TasteComparison> {
  const [mine, theirs] = await Promise.all([
    perMovieAverages(myUserId),
    perMovieAverages(theirUserId),
  ]);

  const shared: SharedMovie[] = [];
  for (const [movieId, m] of mine) {
    const t = theirs.get(movieId);
    if (t) {
      shared.push({ movie: m.movie, mine: m.avg, theirs: t.avg, diff: m.avg - t.avg });
    }
  }
  shared.sort((a, b) => b.mine + b.theirs - (a.mine + a.theirs));

  const avgAbsDiff = shared.length
    ? shared.reduce((s, x) => s + Math.abs(x.diff), 0) / shared.length
    : null;
  const matchPercent = avgAbsDiff == null ? null : Math.round(100 * (1 - avgAbsDiff / 9));

  const onlyTheirs = [...theirs.entries()]
    .filter(([movieId]) => !mine.has(movieId))
    .map(([, v]) => ({ movie: v.movie, score: v.avg }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return {
    myCount: mine.size,
    theirCount: theirs.size,
    shared,
    matchPercent,
    bothLoved: shared.filter((s) => s.mine >= 8 && s.theirs >= 8),
    disagreements: [...shared]
      .filter((s) => Math.abs(s.diff) >= 2)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 6),
    iLikedMore: shared.filter((s) => s.diff >= 2),
    theyLikedMore: shared.filter((s) => s.diff <= -2),
    myTopGenres: topGenres([...mine.values()]).slice(0, 5),
    theirTopGenres: topGenres([...theirs.values()]).slice(0, 5),
    onlyTheirs,
  };
}
