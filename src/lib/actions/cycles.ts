"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return session.user.id;
}

/**
 * Admin-only: closes out a cycle that's finished watching and immediately
 * opens the next cycle's nomination phase, so the club never sits idle.
 */
export async function markCycleWatched(
  clubId: string,
  cycleId: string,
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const [membership, club, cycle] = await Promise.all([
    prisma.clubMembership.findUnique({ where: { userId_clubId: { userId, clubId } } }),
    prisma.club.findUnique({ where: { id: clubId } }),
    prisma.cycle.findUnique({ where: { id: cycleId } }),
  ]);
  if (!membership || membership.role !== "ADMIN") throw new Error("Only the admin can do this");
  if (!club || !cycle || cycle.clubId !== clubId || cycle.phase !== "WATCHING") return {};

  const now = new Date();
  await prisma.$transaction([
    prisma.cycle.update({
      where: { id: cycleId },
      data: { phase: "COMPLETED", watchEndAt: now, endsAt: now },
    }),
    prisma.cycle.create({
      data: {
        clubId,
        cycleNumber: cycle.cycleNumber + 1,
        phase: "NOMINATING",
        winnersPerCycle: club.winnersPerCycle,
        startsAt: now,
        endsAt: new Date(now.getTime() + club.scheduleIntervalDays * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  revalidatePath(`/clubs/${clubId}`);
  redirect(`/clubs/${clubId}`);
}
