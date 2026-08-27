import { prisma } from "@/lib/prisma";
import { tallyApproval, type Ballot } from "@/lib/voting";

export type CycleResultRow = {
  nominationId: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  votes: number;
  isWinner: boolean;
  nominatedBy: { name: string | null; username: string | null; image: string | null };
  voters: { id: string; name: string | null; username: string | null; image: string | null }[];
};

export type CycleResults = {
  cycleNumber: number;
  phase: string;
  votingEndAt: Date | null;
  winnersPerCycle: number;
  voterCount: number;
  memberCount: number;
  rows: CycleResultRow[];
};

/**
 * Recomputes the published tally for a cycle whose voting has closed. Votes
 * are kept after closing, so results stay reproducible rather than needing a
 * separate results table. Returns null while voting is still open.
 */
export async function getCycleResults(
  clubId: string,
  cycleId: string,
): Promise<CycleResults | null> {
  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
  if (!cycle || cycle.clubId !== clubId) return null;
  if (cycle.phase === "NOMINATING" || cycle.phase === "VOTING") return null;

  const [nominations, votes, memberCount] = await Promise.all([
    prisma.nomination.findMany({
      where: { cycleId },
      orderBy: { createdAt: "asc" },
      include: {
        movie: { select: { tmdbId: true, title: true, posterPath: true } },
        nominatedBy: { select: { name: true, username: true, image: true } },
      },
    }),
    prisma.vote.findMany({
      where: { cycleId },
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
    }),
    prisma.clubMembership.count({ where: { clubId } }),
  ]);
  if (nominations.length === 0) return null;

  const ballotsByUser = new Map<string, Ballot>();
  for (const vote of votes) {
    const ballot = ballotsByUser.get(vote.userId) ?? [];
    ballot.push({ nominationId: vote.nominationId, rank: vote.rank });
    ballotsByUser.set(vote.userId, ballot);
  }

  const nominationIds = nominations.map((n) => n.id);
  const tally = tallyApproval(
    nominationIds,
    [...ballotsByUser.values()],
    Math.min(cycle.winnersPerCycle, nominations.length),
    nominationIds,
  );

  const nominationById = new Map(nominations.map((n) => [n.id, n]));
  const votersByNomination = new Map<string, CycleResultRow["voters"]>();
  for (const vote of votes) {
    const list = votersByNomination.get(vote.nominationId) ?? [];
    list.push(vote.user);
    votersByNomination.set(vote.nominationId, list);
  }

  const rows: CycleResultRow[] = tally.flatMap((row) => {
    const nomination = nominationById.get(row.nominationId);
    if (!nomination) return [];
    return [
      {
        nominationId: row.nominationId,
        tmdbId: nomination.movie.tmdbId,
        title: nomination.movie.title,
        posterPath: nomination.movie.posterPath,
        votes: row.votes,
        isWinner: row.isWinner,
        nominatedBy: nomination.nominatedBy,
        voters: votersByNomination.get(row.nominationId) ?? [],
      },
    ];
  });

  return {
    cycleNumber: cycle.cycleNumber,
    phase: cycle.phase,
    votingEndAt: cycle.votingEndAt,
    winnersPerCycle: cycle.winnersPerCycle,
    voterCount: ballotsByUser.size,
    memberCount,
    rows,
  };
}
