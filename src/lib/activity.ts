import { prisma } from "@/lib/prisma";
import type { ActivityType, Prisma } from "@prisma/client";

export async function logActivity(params: {
  userId: string;
  type: ActivityType;
  clubId?: string;
  movieId?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.activityFeedItem.create({
    data: {
      userId: params.userId,
      type: params.type,
      clubId: params.clubId,
      movieId: params.movieId,
      targetId: params.targetId,
      metadata: params.metadata,
    },
  });
}
