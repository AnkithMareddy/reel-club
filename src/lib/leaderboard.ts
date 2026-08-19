import { prisma } from "@/lib/prisma";

export async function getClubLeaderboard(clubId: string) {
  const [topRatedGroups, cycles, votes, nominations, memberRatingGroups] = await Promise.all([
    prisma.rating.groupBy({
      by: ["movieId"],
      where: { clubId },
      _avg: { score: true },
      _count: true,
      orderBy: { _avg: { score: "desc" } },
      take: 10,
    }),
    prisma.cycle.findMany({
      where: { clubId, watchedMovies: { some: {} } },
      orderBy: { cycleNumber: "desc" },
      include: { watchedMovies: { include: { movie: true } } },
    }),
    prisma.vote.findMany({
      where: { cycle: { clubId } },
      select: { userId: true, cycleId: true },
    }),
    prisma.nomination.findMany({
      where: { cycle: { clubId } },
      select: { nominatedById: true },
    }),
    prisma.rating.groupBy({
      by: ["userId"],
      where: { clubId },
      _avg: { score: true },
      _count: true,
    }),
  ]);

  const movies = await prisma.movie.findMany({
    where: { id: { in: topRatedGroups.map((g) => g.movieId) } },
  });
  const movieMap = new Map(movies.map((m) => [m.id, m]));
  const topRatedMovies = topRatedGroups
    .map((g) => ({
      movie: movieMap.get(g.movieId),
      avg: g._avg.score ?? 0,
      count: g._count,
    }))
    .filter((x): x is { movie: NonNullable<typeof x.movie>; avg: number; count: number } =>
      Boolean(x.movie),
    );

  const nominationCounts = new Map<string, number>();
  for (const n of nominations) {
    nominationCounts.set(n.nominatedById, (nominationCounts.get(n.nominatedById) ?? 0) + 1);
  }

  const votedCyclesByUser = new Map<string, Set<string>>();
  for (const v of votes) {
    const set = votedCyclesByUser.get(v.userId) ?? new Set<string>();
    set.add(v.cycleId);
    votedCyclesByUser.set(v.userId, set);
  }

  const userIds = new Set<string>([
    ...memberRatingGroups.map((g) => g.userId),
    ...nominationCounts.keys(),
    ...votedCyclesByUser.keys(),
  ]);
  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, name: true, username: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const memberRatings = memberRatingGroups
    .map((g) => ({ user: userMap.get(g.userId), avg: g._avg.score ?? 0, count: g._count }))
    .filter((x): x is { user: NonNullable<typeof x.user>; avg: number; count: number } =>
      Boolean(x.user),
    );

  const byCount = <T extends { count: number }>(entries: T[]) =>
    [...entries].sort((a, b) => b.count - a.count)[0] ?? null;

  return {
    allTimeFavorite: topRatedMovies[0] ?? null,
    topRatedMovies,
    cycleHistory: cycles,
    harshestCritic: [...memberRatings].sort((a, b) => a.avg - b.avg)[0] ?? null,
    mostEnthusiastic: [...memberRatings].sort((a, b) => b.avg - a.avg)[0] ?? null,
    mostNominations: byCount(
      [...nominationCounts.entries()]
        .map(([userId, count]) => ({ user: userMap.get(userId), count }))
        .filter((x): x is { user: NonNullable<typeof x.user>; count: number } => Boolean(x.user)),
    ),
    mostVotes: byCount(
      [...votedCyclesByUser.entries()]
        .map(([userId, set]) => ({ user: userMap.get(userId), count: set.size }))
        .filter((x): x is { user: NonNullable<typeof x.user>; count: number } => Boolean(x.user)),
    ),
  };
}
