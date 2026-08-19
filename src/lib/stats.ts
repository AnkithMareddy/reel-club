import { prisma } from "@/lib/prisma";

type RatingForStats = {
  score: number;
  movie: {
    releaseDate: Date | null;
    runtime: number | null;
    genres: { id: string; name: string }[];
    directors: { id: string; name: string }[];
  };
};

export type NamedStat = { id: string; name: string; count: number; avg: number };

export type ComputedStats = {
  totalMovies: number;
  avgRating: number; // 1-10 scale
  distribution: { score: number; count: number }[]; // score 1..10
  genresByCount: NamedStat[];
  genresByAvg: NamedStat[];
  directorsByCount: NamedStat[];
  decades: NamedStat[]; // name = "1990s"
  runtimeBuckets: NamedStat[]; // name = "Under 90 min" etc.
};

const RUNTIME_BUCKETS: [string, (min: number) => boolean][] = [
  ["Under 90 min", (m) => m < 90],
  ["90–120 min", (m) => m >= 90 && m < 120],
  ["120–150 min", (m) => m >= 120 && m < 150],
  ["150+ min", (m) => m >= 150],
];

function tally(entries: { id: string; name: string; score: number }[]): NamedStat[] {
  const map = new Map<string, { name: string; count: number; total: number }>();
  for (const e of entries) {
    const existing = map.get(e.id) ?? { name: e.name, count: 0, total: 0 };
    existing.count += 1;
    existing.total += e.score;
    map.set(e.id, existing);
  }
  return [...map.entries()].map(([id, v]) => ({
    id,
    name: v.name,
    count: v.count,
    avg: v.total / v.count,
  }));
}

export function computeStats(ratings: RatingForStats[]): ComputedStats {
  const totalMovies = ratings.length;
  const avgRating = totalMovies ? ratings.reduce((s, r) => s + r.score, 0) / totalMovies : 0;

  const distribution = Array.from({ length: 10 }, (_, i) => ({
    score: i + 1,
    count: ratings.filter((r) => r.score === i + 1).length,
  }));

  const genreEntries = ratings.flatMap((r) =>
    r.movie.genres.map((g) => ({ id: g.id, name: g.name, score: r.score })),
  );
  const genreStats = tally(genreEntries);

  const directorEntries = ratings.flatMap((r) =>
    r.movie.directors.map((d) => ({ id: d.id, name: d.name, score: r.score })),
  );
  const directorStats = tally(directorEntries);

  const decadeEntries = ratings
    .filter((r) => r.movie.releaseDate)
    .map((r) => {
      const year = r.movie.releaseDate!.getFullYear();
      const decade = Math.floor(year / 10) * 10;
      return { id: String(decade), name: `${decade}s`, score: r.score };
    });
  const decadeStats = tally(decadeEntries).sort((a, b) => Number(a.id) - Number(b.id));

  const runtimeEntries = ratings
    .filter((r) => r.movie.runtime)
    .map((r) => {
      const bucket = RUNTIME_BUCKETS.find(([, test]) => test(r.movie.runtime!));
      const name = bucket?.[0] ?? "Unknown";
      return { id: name, name, score: r.score };
    });
  const runtimeStats = tally(runtimeEntries).sort(
    (a, b) => RUNTIME_BUCKETS.findIndex((b2) => b2[0] === a.name) - RUNTIME_BUCKETS.findIndex((b2) => b2[0] === b.name),
  );

  return {
    totalMovies,
    avgRating,
    distribution,
    genresByCount: [...genreStats].sort((a, b) => b.count - a.count),
    genresByAvg: [...genreStats].filter((g) => g.count >= 2).sort((a, b) => b.avg - a.avg),
    directorsByCount: [...directorStats].sort((a, b) => b.count - a.count),
    decades: decadeStats,
    runtimeBuckets: runtimeStats,
  };
}

const ratingSelect = {
  score: true,
  movie: {
    select: {
      releaseDate: true,
      runtime: true,
      genres: { select: { id: true, name: true } },
      directors: { select: { id: true, name: true } },
    },
  },
} as const;

export async function getUserStats(userId: string, clubId?: string) {
  const ratings = await prisma.rating.findMany({
    where: { userId, ...(clubId ? { clubId } : {}) },
    select: ratingSelect,
  });
  return computeStats(ratings);
}

export async function getClubStats(clubId: string) {
  const ratings = await prisma.rating.findMany({
    where: { clubId },
    select: ratingSelect,
  });
  return computeStats(ratings);
}
