"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

async function requireUserId() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
}

export type FriendActionState = { error?: string; success?: string } | undefined;

const identifierSchema = z.string().trim().min(1, "Enter a username or email");

export async function sendFriendRequest(
  _prev: FriendActionState,
  formData: FormData,
): Promise<FriendActionState> {
  const userId = await requireUserId();
  const parsed = identifierSchema.safeParse(formData.get("identifier"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const identifier = parsed.data.toLowerCase();
  const target = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });
  if (!target) return { error: "No user found with that username or email" };
  if (target.id === userId) return { error: "That's you!" };

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") return { error: "You're already friends" };
    if (existing.requesterId === userId) return { error: "Request already sent" };

    // They'd already requested us — accept instead of creating a duplicate.
    await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: "ACCEPTED" },
    });
    await recordFriendAdded(userId, target.id);
    revalidatePath("/friends");
    return { success: `You and ${target.name} are now friends` };
  }

  await prisma.friendship.create({
    data: { requesterId: userId, addresseeId: target.id },
  });
  revalidatePath("/friends");
  return { success: `Friend request sent to ${target.name}` };
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  const userId = await requireUserId();
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || friendship.addresseeId !== userId) throw new Error("Not found");

  if (accept) {
    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: "ACCEPTED" },
    });
    await recordFriendAdded(friendship.requesterId, friendship.addresseeId);
  } else {
    await prisma.friendship.delete({ where: { id: friendshipId } });
  }
  revalidatePath("/friends");
}

export async function cancelOrRemoveFriendship(friendshipId: string) {
  const userId = await requireUserId();
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) return;
  if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
    throw new Error("Not authorized");
  }
  await prisma.friendship.delete({ where: { id: friendshipId } });
  revalidatePath("/friends");
}

async function recordFriendAdded(userAId: string, userBId: string) {
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({ where: { id: userAId }, select: { name: true, username: true, image: true } }),
    prisma.user.findUnique({ where: { id: userBId }, select: { name: true, username: true, image: true } }),
  ]);
  await Promise.all([
    logActivity({ userId: userAId, type: "FRIEND_ADDED", targetId: userBId, metadata: { friend: userB } }),
    logActivity({ userId: userBId, type: "FRIEND_ADDED", targetId: userAId, metadata: { friend: userA } }),
  ]);
}
