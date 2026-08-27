"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tallyApproval, type Ballot } from "@/lib/voting";
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
    where: { cycleId },
    select: { id: true },
  });
  const validIds = new Set(nominations.map((n) => n.id));
  if (picks.some((id) => !validIds.has(id))) {
    return { error: "That nomination isn't part of this cycle" };
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

export async function closeVoting(
  clubId: string,
  cycleId: string,
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership || membership.role !== "ADMIN") throw new Error("Only the admin can do this");

  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
  if (!cycle || cycle.clubId !== clubId || cycle.phase !== "VOTING") return {};

  const [nominations, votes] = await Promise.all([
    prisma.nomination.findMany({
      where: { cycleId },
      orderBy: { createdAt: "asc" },
      include: { movie: { select: { id: true, title: true, posterPath: true } } },
    }),
    prisma.vote.findMany({ where: { cycleId } }),
  ]);
  if (nominations.length === 0) return { error: "There are no nominations to select from" };

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
  const winnerNominationIds = new Set(
    tally.filter((row) => row.isWinner).map((row) => row.nominationId),
  );

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
