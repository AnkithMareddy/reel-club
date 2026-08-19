"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return session.user.id;
}

export async function toggleReviewLike(reviewId: string, revalidatePathTarget: string) {
  const userId = await requireUserId();

  const existing = await prisma.reviewLike.findUnique({
    where: { reviewId_userId: { reviewId, userId } },
  });
  if (existing) {
    await prisma.reviewLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.reviewLike.create({ data: { reviewId, userId } });
  }
  revalidatePath(revalidatePathTarget);
}

const commentSchema = z.string().trim().min(1, "Comment can't be empty").max(500);

export type CommentFormState = { error?: string } | undefined;

export async function addReviewComment(
  reviewId: string,
  revalidatePathTarget: string,
  _prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const userId = await requireUserId();

  const parsed = commentSchema.safeParse(formData.get("body"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.reviewComment.create({
    data: { reviewId, userId, body: parsed.data },
  });

  revalidatePath(revalidatePathTarget);
  return undefined;
}
