import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PickBallot } from "@/components/pick-ballot";
import { CloseVotingDialog } from "@/components/close-voting-dialog";

export default async function VotePage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) notFound();

  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) redirect(`/clubs/${clubId}`);

  const cycle = await prisma.cycle.findFirst({
    where: { clubId },
    orderBy: { cycleNumber: "desc" },
  });
  if (!cycle || cycle.phase !== "VOTING") redirect(`/clubs/${clubId}`);

  const [nominations, myVotes, votedUserIds, memberCount] = await Promise.all([
    prisma.nomination.findMany({
      where: { cycleId: cycle.id, eliminated: false },
      include: { movie: { select: { id: true, title: true, posterPath: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.vote.findMany({
      where: { cycleId: cycle.id, userId },
      orderBy: { rank: "asc" },
    }),
    prisma.vote.findMany({
      where: { cycleId: cycle.id },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.clubMembership.count({ where: { clubId } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/clubs/${clubId}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to {club.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {cycle.runoffRound > 0 ? `Runoff — round ${cycle.runoffRound + 1}` : "Vote"}
        </h1>
        <p className="text-muted-foreground">
          Cycle {cycle.cycleNumber} · {votedUserIds.length} of {memberCount} member
          {memberCount === 1 ? "" : "s"} have voted so far — individual votes stay anonymous
          until voting closes.
        </p>
      </div>

      {cycle.runoffRound > 0 && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
          <p className="font-medium">Last round ended in a tie.</p>
          <p className="text-muted-foreground">
            Only the tied movies are on the ballot now — vote again to break it.
          </p>
        </div>
      )}

      <PickBallot
        clubId={clubId}
        cycleId={cycle.id}
        movies={nominations.map((n) => ({
          nominationId: n.id,
          title: n.movie.title,
          posterPath: n.movie.posterPath,
          isOwnNomination: n.nominatedById === userId,
        }))}
        maxPicks={Math.max(1, cycle.winnersPerCycle)}
        initialPicks={myVotes.map((v) => v.nominationId)}
      />

      {membership.role === "ADMIN" && (
        <div className="border-t pt-6">
          <CloseVotingDialog
            clubId={clubId}
            cycleId={cycle.id}
            votedCount={votedUserIds.length}
            memberCount={memberCount}
            winnersPerCycle={club.winnersPerCycle}
          />
        </div>
      )}
    </div>
  );
}
