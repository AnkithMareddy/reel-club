"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCacheMovie } from "@/lib/movies";
import { getListAccess } from "@/lib/list-access";
import type { ListVisibility } from "@/lib/list-visibility";

async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true },
  });
  if (!user) redirect("/");
  return user;
}

export type ListActionResult = { error: string } | { success: true; listId?: string };

export async function createList(input: {
  title: string;
  description?: string;
  isRanked: boolean;
  visibility?: ListVisibility;
}): Promise<ListActionResult> {
  const user = await requireUser();
  const title = input.title.trim();
  if (!title) return { error: "Give the list a title" };
  if (title.length > 100) return { error: "Title is too long" };

  const list = await prisma.movieList.create({
    data: {
      ownerId: user.id,
      title,
      description: input.description?.trim() || null,
      isRanked: input.isRanked,
      visibility: input.visibility ?? "PRIVATE",
    },
  });

  revalidatePath("/lists");
  if (user.username) revalidatePath(`/profile/${user.username}`);
  return { success: true, listId: list.id };
}

export async function updateList(
  listId: string,
  input: {
    title: string;
    description?: string;
    isRanked: boolean;
    visibility: ListVisibility;
  },
): Promise<ListActionResult> {
  const user = await requireUser();
  const access = await getListAccess(listId, user.id);
  if (!access.canManage) return { error: "Only the list owner can change its settings" };
  const title = input.title.trim();
  if (!title) return { error: "Give the list a title" };

  await prisma.movieList.update({
    where: { id: listId },
    data: {
      title,
      description: input.description?.trim() || null,
      isRanked: input.isRanked,
      visibility: input.visibility,
    },
  });
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/lists");
  return { success: true };
}

export async function deleteList(listId: string): Promise<ListActionResult> {
  const user = await requireUser();
  const access = await getListAccess(listId, user.id);
  if (!access.canManage) return { error: "Only the list owner can delete it" };

  await prisma.movieList.delete({ where: { id: listId } });
  revalidatePath("/lists");
  if (user.username) revalidatePath(`/profile/${user.username}`);
  redirect("/lists");
}

export async function addMovieToList(listId: string, tmdbId: number): Promise<ListActionResult> {
  const user = await requireUser();
  const access = await getListAccess(listId, user.id);
  if (!access.canEditItems) return { error: "You can't edit this list" };

  const movie = await getOrCacheMovie(tmdbId);
  const existing = await prisma.movieListItem.findUnique({
    where: { listId_movieId: { listId, movieId: movie.id } },
  });
  if (existing) return { error: "That movie is already on the list" };

  const last = await prisma.movieListItem.findFirst({
    where: { listId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  await prisma.movieListItem.create({
    data: { listId, movieId: movie.id, position: (last?.position ?? 0) + 1 },
  });

  revalidatePath(`/lists/${listId}`);
  return { success: true };
}

export async function removeListItem(listId: string, itemId: string): Promise<ListActionResult> {
  const user = await requireUser();
  const access = await getListAccess(listId, user.id);
  if (!access.canEditItems) return { error: "You can't edit this list" };

  await prisma.movieListItem.deleteMany({ where: { id: itemId, listId } });

  // Close the gap so positions stay dense (1..n).
  const items = await prisma.movieListItem.findMany({
    where: { listId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    items.map((item, i) =>
      prisma.movieListItem.update({ where: { id: item.id }, data: { position: i + 1 } }),
    ),
  );

  revalidatePath(`/lists/${listId}`);
  return { success: true };
}

/** Moves an item one slot up or down; positions stay dense. */
export async function moveListItem(
  listId: string,
  itemId: string,
  direction: "up" | "down",
): Promise<ListActionResult> {
  const user = await requireUser();
  const access = await getListAccess(listId, user.id);
  if (!access.canEditItems) return { error: "You can't edit this list" };

  const items = await prisma.movieListItem.findMany({
    where: { listId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const index = items.findIndex((i) => i.id === itemId);
  if (index === -1) return { error: "Item not found" };
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= items.length) return { success: true };

  await prisma.$transaction([
    prisma.movieListItem.update({ where: { id: items[index].id }, data: { position: swapWith + 1 } }),
    prisma.movieListItem.update({ where: { id: items[swapWith].id }, data: { position: index + 1 } }),
  ]);

  revalidatePath(`/lists/${listId}`);
  return { success: true };
}

/** Owner-only: invite an accepted friend to co-edit the list. */
export async function addListCollaborator(
  listId: string,
  collaboratorUserId: string,
): Promise<ListActionResult> {
  const user = await requireUser();
  const access = await getListAccess(listId, user.id);
  if (!access.canManage) return { error: "Only the list owner can add collaborators" };
  if (collaboratorUserId === user.id) return { error: "You already own this list" };

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: user.id, addresseeId: collaboratorUserId },
        { requesterId: collaboratorUserId, addresseeId: user.id },
      ],
    },
    select: { id: true },
  });
  if (!friendship) return { error: "You can only add friends as collaborators" };

  await prisma.movieListCollaborator.upsert({
    where: { listId_userId: { listId, userId: collaboratorUserId } },
    create: { listId, userId: collaboratorUserId },
    update: {},
  });

  revalidatePath(`/lists/${listId}`);
  return { success: true };
}

export async function removeListCollaborator(
  listId: string,
  collaboratorUserId: string,
): Promise<ListActionResult> {
  const user = await requireUser();
  const access = await getListAccess(listId, user.id);
  // Owners can remove anyone; a collaborator can remove themselves.
  if (!access.canManage && collaboratorUserId !== user.id) {
    return { error: "You can't change this list's collaborators" };
  }

  await prisma.movieListCollaborator.deleteMany({
    where: { listId, userId: collaboratorUserId },
  });

  revalidatePath(`/lists/${listId}`);
  return { success: true };
}
