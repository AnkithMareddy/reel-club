"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/invite-code";
import { logActivity } from "@/lib/activity";

async function requireUserId() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return session.user.id;
}

async function requireAdmin(clubId: string, userId: string) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership || membership.role !== "ADMIN") {
    throw new Error("Only the club admin can do this");
  }
}

const SCHEDULE_DAYS: Record<string, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
};

const createClubSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  coverImage: z.string().trim().url().optional().or(z.literal("")),
  scheduleType: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]),
  scheduleIntervalDays: z.coerce.number().int().min(1).max(365),
  winnersPerCycle: z.coerce.number().int().min(1).max(5),
  nominationsPerMember: z.coerce.number().int().min(1).max(10),
});

export type ClubFormState = { error?: string } | undefined;

export async function createClub(
  _prevState: ClubFormState,
  formData: FormData,
): Promise<ClubFormState> {
  const userId = await requireUserId();

  const scheduleType = String(formData.get("scheduleType") ?? "WEEKLY");
  const parsed = createClubSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    coverImage: formData.get("coverImage"),
    scheduleType,
    scheduleIntervalDays:
      scheduleType === "CUSTOM"
        ? formData.get("scheduleIntervalDays")
        : SCHEDULE_DAYS[scheduleType],
    winnersPerCycle: formData.get("winnersPerCycle"),
    nominationsPerMember: formData.get("nominationsPerMember"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  let club;
  // Invite codes are short and could collide; retry a couple times on the
  // rare unique-constraint hit rather than widening the alphabet up front.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      club = await prisma.club.create({
        data: {
          name: data.name,
          description: data.description || null,
          coverImage: data.coverImage || null,
          scheduleType: data.scheduleType,
          scheduleIntervalDays: data.scheduleIntervalDays,
          winnersPerCycle: data.winnersPerCycle,
          nominationsPerMember: data.nominationsPerMember,
          inviteCode: generateInviteCode(),
          createdById: userId,
          memberships: { create: { userId, role: "ADMIN" } },
          cycles: {
            create: {
              cycleNumber: 1,
              phase: "NOMINATING",
              winnersPerCycle: data.winnersPerCycle,
              startsAt: new Date(),
              endsAt: new Date(Date.now() + data.scheduleIntervalDays * 24 * 60 * 60 * 1000),
            },
          },
        },
      });
      break;
    } catch (err) {
      if (err instanceof Error && err.message.includes("Unique constraint")) continue;
      throw err;
    }
  }
  if (!club) return { error: "Could not create club, please try again" };

  redirect(`/clubs/${club.id}`);
}

const joinClubSchema = z.object({
  inviteCode: z.string().trim().min(1, "Enter an invite code"),
});

export type JoinClubState = { error?: string } | undefined;

export async function joinClub(
  _prevState: JoinClubState,
  formData: FormData,
): Promise<JoinClubState> {
  const userId = await requireUserId();
  const parsed = joinClubSchema.safeParse({ inviteCode: formData.get("inviteCode") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const club = await prisma.club.findUnique({
    where: { inviteCode: parsed.data.inviteCode.trim().toUpperCase() },
  });
  if (!club) return { error: "No club found with that invite code" };

  await joinClubById(club.id, userId);
  redirect(`/clubs/${club.id}`);
}

export async function joinClubById(clubId: string, userId: string) {
  const existing = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (existing) return;

  await prisma.clubMembership.create({ data: { userId, clubId } });
  await logActivity({ userId, type: "JOINED_CLUB", clubId });
  revalidatePath(`/clubs/${clubId}`);
  revalidatePath("/clubs");
}

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  coverImage: z.string().trim().url().optional().or(z.literal("")),
  scheduleType: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]),
  scheduleIntervalDays: z.coerce.number().int().min(1).max(365),
  winnersPerCycle: z.coerce.number().int().min(1).max(5),
  nominationsPerMember: z.coerce.number().int().min(1).max(10),
});

export async function updateClubSettings(
  clubId: string,
  _prevState: ClubFormState,
  formData: FormData,
): Promise<ClubFormState> {
  const userId = await requireUserId();
  await requireAdmin(clubId, userId);

  const scheduleType = String(formData.get("scheduleType") ?? "WEEKLY");
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    coverImage: formData.get("coverImage"),
    scheduleType,
    scheduleIntervalDays:
      scheduleType === "CUSTOM"
        ? formData.get("scheduleIntervalDays")
        : SCHEDULE_DAYS[scheduleType],
    winnersPerCycle: formData.get("winnersPerCycle"),
    nominationsPerMember: formData.get("nominationsPerMember"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  await prisma.club.update({
    where: { id: clubId },
    data: {
      name: data.name,
      description: data.description || null,
      coverImage: data.coverImage || null,
      scheduleType: data.scheduleType,
      scheduleIntervalDays: data.scheduleIntervalDays,
      winnersPerCycle: data.winnersPerCycle,
      nominationsPerMember: data.nominationsPerMember,
    },
  });

  revalidatePath(`/clubs/${clubId}`);
  revalidatePath(`/clubs/${clubId}/settings`);
  return undefined;
}

export async function removeMember(clubId: string, targetUserId: string) {
  const userId = await requireUserId();
  await requireAdmin(clubId, userId);
  if (targetUserId === userId) throw new Error("Use transfer admin, then leave the club");

  await prisma.clubMembership.delete({
    where: { userId_clubId: { userId: targetUserId, clubId } },
  });
  revalidatePath(`/clubs/${clubId}/settings`);
  revalidatePath(`/clubs/${clubId}`);
}

export async function transferAdmin(clubId: string, targetUserId: string) {
  const userId = await requireUserId();
  await requireAdmin(clubId, userId);

  await prisma.$transaction([
    prisma.clubMembership.update({
      where: { userId_clubId: { userId, clubId } },
      data: { role: "MEMBER" },
    }),
    prisma.clubMembership.update({
      where: { userId_clubId: { userId: targetUserId, clubId } },
      data: { role: "ADMIN" },
    }),
  ]);
  revalidatePath(`/clubs/${clubId}/settings`);
  revalidatePath(`/clubs/${clubId}`);
}

export async function leaveClub(clubId: string) {
  const userId = await requireUserId();
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) return;
  if (membership.role === "ADMIN") {
    const otherAdmins = await prisma.clubMembership.count({
      where: { clubId, role: "ADMIN", NOT: { userId } },
    });
    if (otherAdmins === 0) {
      const anotherMember = await prisma.clubMembership.findFirst({
        where: { clubId, NOT: { userId } },
      });
      if (anotherMember) {
        await prisma.clubMembership.update({
          where: { id: anotherMember.id },
          data: { role: "ADMIN" },
        });
      }
    }
  }
  await prisma.clubMembership.delete({ where: { id: membership.id } });
  revalidatePath("/clubs");
  redirect("/clubs");
}

export async function deleteClub(clubId: string) {
  const userId = await requireUserId();
  await requireAdmin(clubId, userId);
  await prisma.club.delete({ where: { id: clubId } });
  revalidatePath("/clubs");
  redirect("/clubs");
}
