import { prisma } from "@/lib/prisma";

const activityInclude = {
  user: { select: { id: true, name: true, username: true, image: true } },
  club: { select: { id: true, name: true } },
  movie: { select: { id: true, title: true, posterPath: true, tmdbId: true } },
} as const;

export async function getClubActivity(clubId: string, take = 30) {
  return prisma.activityFeedItem.findMany({
    where: { clubId },
    include: activityInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

async function getFriendIds(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
}

/**
 * Combines full activity from the viewer's own clubs with a privacy-limited
 * slice of friends' activity from clubs the viewer isn't in: only ratings,
 * reviews (respecting the review's own visibility flag), and new
 * friendships — never nominations/votes/winners from a club the viewer
 * doesn't belong to.
 */
export async function getFriendsActivity(userId: string, take = 30) {
  const [myClubIds, friendIds] = await Promise.all([
    prisma.clubMembership
      .findMany({ where: { userId }, select: { clubId: true } })
      .then((rows) => rows.map((r) => r.clubId)),
    getFriendIds(userId),
  ]);

  const items = await prisma.activityFeedItem.findMany({
    where: {
      OR: [
        { clubId: { in: myClubIds } },
        {
          userId: { in: friendIds },
          type: { in: ["RATED_MOVIE", "REVIEWED_MOVIE", "FRIEND_ADDED"] },
        },
      ],
    },
    include: activityInclude,
    orderBy: { createdAt: "desc" },
    take: take * 2,
  });

  const outsideReviewItems = items.filter(
    (i) => i.type === "REVIEWED_MOVIE" && i.targetId && !myClubIds.includes(i.clubId ?? ""),
  );
  const reviews = outsideReviewItems.length
    ? await prisma.review.findMany({
        where: {
          OR: outsideReviewItems.map((i) => ({
            userId: i.userId,
            watchedMovieId: i.targetId!,
          })),
        },
        select: { userId: true, watchedMovieId: true, visibility: true },
      })
    : [];
  const visibleOutsideReviews = new Set(
    reviews
      .filter((r) => r.visibility === "CLUB_AND_FRIENDS")
      .map((r) => `${r.userId}:${r.watchedMovieId}`),
  );

  const filtered = items.filter((i) => {
    if (i.type !== "REVIEWED_MOVIE") return true;
    if (myClubIds.includes(i.clubId ?? "")) return true;
    return visibleOutsideReviews.has(`${i.userId}:${i.targetId}`);
  });

  return filtered.slice(0, take);
}

export type ActivityItem = Awaited<ReturnType<typeof getClubActivity>>[number];
