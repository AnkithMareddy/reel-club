import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BackfillImportClient } from "@/components/backfill-import-client";

export default async function BackfillPage({
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
  if (!membership || membership.role !== "ADMIN") redirect(`/clubs/${clubId}`);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/clubs/${clubId}/settings`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to settings
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import historical data for {club.name}
        </h1>
        <p className="text-muted-foreground">
          Add movies and ratings from before the club used Reel Club. These count toward the
          club&apos;s stats and leaderboard just like a normal watched movie.
        </p>
      </div>
      <BackfillImportClient clubId={clubId} />
    </div>
  );
}
