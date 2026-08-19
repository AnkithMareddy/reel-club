import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClubActivity } from "@/lib/activity-feed";
import { ActivityFeedList } from "@/components/activity-feed-list";

export default async function ClubActivityPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
  if (!club) notFound();

  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) redirect(`/clubs/${clubId}`);

  const items = await getClubActivity(clubId, 50);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href={`/clubs/${clubId}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to {club.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
      </div>
      <ActivityFeedList items={items} />
    </div>
  );
}
