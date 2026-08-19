"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(20)
    .regex(/^[a-z0-9_]+$/, "Only letters, numbers, and underscores"),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
});

export type ProfileState = { error?: string } | undefined;

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user) redirect("/");

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const taken = await prisma.user.findFirst({
    where: { username: parsed.data.username, NOT: { id: session.user.id } },
    select: { id: true },
  });
  if (taken) return { error: "That username is already taken" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      bio: parsed.data.bio || null,
    },
  });

  revalidatePath("/", "layout");
  redirect("/clubs");
}
