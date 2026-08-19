"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCacheMovie } from "@/lib/movies";
import { logActivity } from "@/lib/activity";

async function requireUserId() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return session.user.id;
}

export type NominateResult = { error?: string } | { success: true };

export async function nominateMovie(
  clubId: string,
  cycleId: string,
  tmdbId: number,
): Promise<NominateResult> {
  const userId = await requireUserId();

  const [membership, club, cycle] = await Promise.all([
    prisma.clubMembership.findUnique({ where: { userId_clubId: { userId, clubId } } }),
    prisma.club.findUnique({ where: { id: clubId } }),
    prisma.cycle.findUnique({ where: { id: cycleId } }),
  ]);
  if (!membership || !club) return { error: "You're not a member of this club" };
  if (!cycle || cycle.clubId !== clubId) return { error: "Cycle not found" };
  if (cycle.phase !== "NOMINATING") return { error: "Nominations are closed for this cycle" };

  const myNominationCount = await prisma.nomination.count({
    where: { cycleId, nominatedById: userId },
  });
  if (myNominationCount >= club.nominationsPerMember) {
    return { error: `You've used all ${club.nominationsPerMember} of your nominations` };
  }

  const movie = await getOrCacheMovie(tmdbId);

  const alreadyNominated = await prisma.nomination.findUnique({
    where: { cycleId_movieId: { cycleId, movieId: movie.id } },
  });
  if (alreadyNominated) return { error: "Someone already nominated that movie" };

  const nomination = await prisma.nomination.create({
    data: { cycleId, movieId: movie.id, nominatedById: userId },
  });

  await logActivity({
    userId,
    type: "NOMINATED_MOVIE",
    clubId,
    movieId: movie.id,
    targetId: nomination.id,
    metadata: { title: movie.title, posterPath: movie.posterPath },
  });

  revalidatePath(`/clubs/${clubId}/nominate`);
  revalidatePath(`/clubs/${clubId}`);
  return { success: true };
}

export async function removeNomination(clubId: string, nominationId: string) {
  const userId = await requireUserId();

  const nomination = await prisma.nomination.findUnique({
    where: { id: nominationId },
    include: { cycle: true },
  });
  if (!nomination || nomination.cycle.clubId !== clubId) return;

  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  const isOwner = nomination.nominatedById === userId;
  const isAdmin = membership?.role === "ADMIN";
  if (!isOwner && !isAdmin) throw new Error("Not authorized");
  if (nomination.cycle.phase !== "NOMINATING") throw new Error("Nominations are closed");

  await prisma.nomination.delete({ where: { id: nominationId } });
  revalidatePath(`/clubs/${clubId}/nominate`);
  revalidatePath(`/clubs/${clubId}`);
}

export async function closeNominations(
  clubId: string,
  cycleId: string,
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership || membership.role !== "ADMIN") throw new Error("Only the admin can do this");

  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
  if (!cycle || cycle.clubId !== clubId || cycle.phase !== "NOMINATING") return {};

  const nominationCount = await prisma.nomination.count({ where: { cycleId } });
  if (nominationCount === 0) {
    return { error: "There are no nominations to vote on yet" };
  }

  await prisma.cycle.update({
    where: { id: cycleId },
    data: { phase: "VOTING", nominationsEndAt: new Date() },
  });

  revalidatePath(`/clubs/${clubId}`);
  revalidatePath(`/clubs/${clubId}/nominate`);
  redirect(`/clubs/${clubId}`);
}
