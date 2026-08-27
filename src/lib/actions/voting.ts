"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tallyApproval, resolveWinners, type Ballot } from "@/lib/voting";
import { logActivity } from "@/lib/activity";

async function requireUserId() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return session.user.id;
}

export type VoteResult = { error?: string } | { success: true };

/**
 * Records a member's picks for the cycle. Members choose up to
 * `winnersPerCycle` movies rather than ranking the whole slate; `rank` is
 * kept only as the order the picks were made in.
 */
export async function submitVote(
  clubId: string,
  cycleId: string,
  nominationIds: string[],
): Promise<VoteResult> {
  const userId = await requireUserId();

  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) return { error: "You're not a member of this club" };

  const [cycle, club] = await Promise.all([
    prisma.cycle.findUnique({ where: { id: cycleId } }),
    prisma.club.findUnique({ where: { id: clubId } }),
  ]);
  if (!cycle || !club || cycle.clubId !== clubId) return { error: "Cycle not found" };
  if (cycle.phase !== "VOTING") return { error: "Voting is closed for this cycle" };

  const picks = [...new Set(nominationIds)];
  if (picks.length === 0) return { error: "Pick at least one movie" };

  const maxPicks = Math.max(1, cycle.winnersPerCycle);
  if (picks.length > maxPicks) {
    return { error: `You can pick at most ${maxPicks} movie${maxPicks === 1 ? "" : "s"}` };
  }

  const nominations = await prisma.nomination.findMany({
    where: { cycleId, eliminated: false },
    select: { id: true, nominatedById: true },
  });
  const byId = new Map(nominations.map((n) => [n.id, n]));
  if (picks.some((id) => !byId.has(id))) {
    return { error: "That nomination isn't part of this round" };
  }
  if (picks.some((id) => byId.get(id)!.nominatedById === userId)) {
    return { error: "You can't vote for a movie you nominated" };
  }

  await prisma.$transaction([
    prisma.vote.deleteMany({ where: { cycleId, userId } }),
    prisma.vote.createMany({
      data: picks.map((nominationId, i) => ({
        cycleId,
        userId,
        nominationId,
        rank: i + 1,
      })),
    }),
  ]);

  revalidatePath(`/clubs/${clubId}/vote`);
  return { success: true };
}

export type CloseVotingResult = {
  error?: string;
  /** Set when a tie forced another round instead of finishing the cycle. */
  runoff?: { round: number; titles: string[]; votes: number; remainingSeats: number };
};

export async function closeVoting(
  clubId: string,
  cycleId: string,
): Promise<CloseVotingResult> {
  const userId = await requireUserId();
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership || membership.role !== "ADMIN") throw new Error("Only the admin can do this");

  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
  if (!cycle || cycle.clubId !== clubId || cycle.phase !== "VOTING") return {};

  const [nominations, votes, alreadyWon] = await Promise.all([
    prisma.nomination.findMany({
      where: { cycleId, eliminated: false },
      orderBy: { createdAt: "asc" },
      include: { movie: { select: { id: true, title: true, posterPath: true } } },
    }),
    prisma.vote.findMany({ where: { cycleId } }),
    // Seats already filled by an earlier round of this cycle.
    prisma.watchedMovie.count({ where: { cycleId } }),
  ]);
  if (nominations.length === 0) return { error: "There are no nominations to select from" };

  const ballotsByUser = new Map<string, Ballot>();
  for (const vote of votes) {
    const ballot = ballotsByUser.get(vote.userId) ?? [];
    ballot.push({ nominationId: vote.nominationId, rank: vote.rank });
    ballotsByUser.set(vote.userId, ballot);
  }

  const nominationIds = nominations.map((n) => n.id);
  const seatsLeft = Math.max(0, cycle.winnersPerCycle - alreadyWon);
  const tally = tallyApproval(
    nominationIds,
    [...ballotsByUser.values()],
    Math.min(seatsLeft, nominations.length),
    nominationIds,
  );

  const outcome = resolveWinners(tally, Math.min(seatsLeft, nominations.length));

  // A tie at the seat boundary can't be settled on votes, so lock in anyone
  // who cleared it outright and send the tied movies to another round.
  if (outcome.kind === "tie") {
    const decidedNominations = nominations.filter((n) => outcome.decided.includes(n.id));
    const tiedNominations = nominations.filter((n) => outcome.tied.includes(n.id));

    await prisma.$transaction([
      ...decidedNominations.map((n) =>
        prisma.watchedMovie.create({ data: { clubId, cycleId, movieId: n.movie.id } }),
      ),
      // Only the tied movies stay on the ballot next round.
      prisma.nomination.updateMany({
        where: { cycleId, id: { notIn: outcome.tied } },
        data: { eliminated: true },
      }),
      prisma.vote.deleteMany({ where: { cycleId } }),
      prisma.cycle.update({
        where: { id: cycleId },
        data: { phase: "VOTING", runoffRound: { increment: 1 } },
      }),
    ]);

    await logActivity({
      userId,
      type: "CYCLE_RUNOFF_STARTED",
      clubId,
      metadata: {
        round: cycle.runoffRound + 1,
        tiedTitles: tiedNominations.map((n) => n.movie.title),
        votes: outcome.votes,
        remainingSeats: outcome.remainingSeats,
      },
    });

    revalidatePath(`/clubs/${clubId}`);
    revalidatePath(`/clubs/${clubId}/vote`);
    return {
      runoff: {
        round: cycle.runoffRound + 1,
        titles: tiedNominations.map((n) => n.movie.title),
        votes: outcome.votes,
        remainingSeats: outcome.remainingSeats,
      },
    };
  }

  const winnerNominationIds = new Set(outcome.winners);
  const winningNominations = nominations.filter((n) => winnerNominationIds.has(n.id));

  await prisma.$transaction([
    ...winningNominations.map((n) =>
      prisma.watchedMovie.create({ data: { clubId, cycleId, movieId: n.movie.id } }),
    ),
    prisma.cycle.update({
      where: { id: cycleId },
      data: { phase: "WATCHING", votingEndAt: new Date() },
    }),
  ]);

  await Promise.all(
    winningNominations.map((n) =>
      logActivity({
        userId,
        type: "CYCLE_WINNERS_ANNOUNCED",
        clubId,
        movieId: n.movie.id,
        metadata: { title: n.movie.title, posterPath: n.movie.posterPath },
      }),
    ),
  );

  revalidatePath(`/clubs/${clubId}`);
  revalidatePath(`/clubs/${clubId}/vote`);
  redirect(`/clubs/${clubId}`);
}
