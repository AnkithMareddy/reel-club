import { prisma } from "@/lib/prisma";

export type ListAccess = {
  canView: boolean;
  /** Add/remove/reorder items — owner and collaborators. */
  canEditItems: boolean;
  /** Rename, change visibility, manage collaborators, delete — owner only. */
  canManage: boolean;
};

const NO_ACCESS: ListAccess = { canView: false, canEditItems: false, canManage: false };

export async function getListAccess(listId: string, userId: string): Promise<ListAccess> {
  const list = await prisma.movieList.findUnique({
    where: { id: listId },
    select: {
      ownerId: true,
      visibility: true,
      collaborators: { where: { userId }, select: { id: true } },
    },
  });
  if (!list) return NO_ACCESS;

  if (list.ownerId === userId) return { canView: true, canEditItems: true, canManage: true };
  if (list.collaborators.length > 0) {
    return { canView: true, canEditItems: true, canManage: false };
  }
  if (list.visibility === "PUBLIC") {
    return { canView: true, canEditItems: false, canManage: false };
  }
  if (list.visibility === "FRIENDS") {
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: userId, addresseeId: list.ownerId },
          { requesterId: list.ownerId, addresseeId: userId },
        ],
      },
      select: { id: true },
    });
    if (friendship) return { canView: true, canEditItems: false, canManage: false };
  }
  return NO_ACCESS;
}

/**
 * Prisma filter for lists `userId` is allowed to see: their own, ones they
 * collaborate on, public ones, and friends-only ones from accepted friends.
 */
export async function visibleListsWhere(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  const friendIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId,
  );

  return {
    OR: [
      { ownerId: userId },
      { collaborators: { some: { userId } } },
      { visibility: "PUBLIC" as const },
      { visibility: "FRIENDS" as const, ownerId: { in: friendIds } },
    ],
  };
}
