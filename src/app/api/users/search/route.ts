import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ results: [] });

  const users = await prisma.user.findMany({
    where: {
      id: { not: session.user.id },
      username: { not: null },
      OR: [
        { username: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, username: true, image: true },
    take: 8,
  });

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: session.user.id, addresseeId: { in: users.map((u) => u.id) } },
        { addresseeId: session.user.id, requesterId: { in: users.map((u) => u.id) } },
      ],
    },
  });
  const statusByUser = new Map(
    friendships.map((f) => [
      f.requesterId === session.user.id ? f.addresseeId : f.requesterId,
      f.status === "ACCEPTED" ? "friends" : f.requesterId === session.user.id ? "sent" : "incoming",
    ]),
  );

  return NextResponse.json({
    results: users.map((u) => ({ ...u, status: statusByUser.get(u.id) ?? "none" })),
  });
}
