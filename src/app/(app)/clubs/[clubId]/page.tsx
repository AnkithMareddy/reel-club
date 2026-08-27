import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { joinClubById } from "@/lib/actions/clubs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyInviteCode } from "@/components/copy-invite-code";
import { MarkWatchedDialog } from "@/components/mark-watched-dialog";
import { ActivityFeedList } from "@/components/activity-feed-list";
import { getClubActivity } from "@/lib/activity-feed";
import { tmdbPosterUrl } from "@/lib/tmdb";

const PHASE_LABEL: Record<string, string> = {
  NOMINATING: "Nominating",
  VOTING: "Voting",
  WATCHING: "Watching",
  COMPLETED: "Completed",
};

export default async function ClubHomePage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: { joinedAt: "asc" },
      },
      cycles: {
        orderBy: { cycleNumber: "desc" },
        take: 1,
        include: {
          _count: { select: { nominations: true } },
          watchedMovies: { include: { movie: true } },
        },
      },
    },
  });
  if (!club) notFound();

  const myMembership = club.memberships.find((m) => m.userId === userId);
  const cycle = club.cycles[0];

  if (!myMembership) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">{club.name}</h1>
        {club.description && <p className="text-muted-foreground">{club.description}</p>}
        <p className="text-sm text-muted-foreground">
          {club.memberships.length} member{club.memberships.length === 1 ? "" : "s"}
        </p>
        <form
          action={async () => {
            "use server";
            await joinClubById(clubId, userId);
          }}
        >
          <Button type="submit">Join this club</Button>
        </form>
      </div>
    );
  }

  const recentActivity = await getClubActivity(clubId, 5);

  return (
    <div className="space-y-6">
      {club.coverImage && (
        <div className="relative h-40 w-full overflow-hidden rounded-lg bg-muted">
          <Image src={club.coverImage} alt="" fill sizes="100vw" className="object-cover" />
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{club.name}</h1>
          {club.description && <p className="text-muted-foreground">{club.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/clubs/${club.id}/leaderboard`}>Leaderboard</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/clubs/${club.id}/stats`}>Stats</Link>
          </Button>
          {myMembership.role === "ADMIN" && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/clubs/${club.id}/settings`}>Settings</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Cycle {cycle?.cycleNumber} — {cycle ? PHASE_LABEL[cycle.phase] ?? cycle.phase : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {cycle?.phase === "NOMINATING" && (
              <p>
                {cycle._count.nominations} movie{cycle._count.nominations === 1 ? "" : "s"}{" "}
                nominated so far.
              </p>
            )}
            {cycle?.phase === "VOTING" && <p>Members are voting on this cycle&apos;s nominees.</p>}
            {cycle?.phase === "WATCHING" && <p>This cycle&apos;s pick is locked in — enjoy the movie.</p>}
            {cycle?.phase === "COMPLETED" && <p>This cycle has wrapped up.</p>}
            {cycle?.endsAt && (
              <p>Cycle ends {new Date(cycle.endsAt).toLocaleDateString()}</p>
            )}
            <p className="pt-1">
              {club.scheduleType === "CUSTOM"
                ? `Every ${club.scheduleIntervalDays} days`
                : club.scheduleType.charAt(0) + club.scheduleType.slice(1).toLowerCase()}
              {" · "}
              {club.winnersPerCycle} winner{club.winnersPerCycle === 1 ? "" : "s"} per cycle
            </p>
            {cycle?.phase === "NOMINATING" && (
              <Button size="sm" className="mt-2" asChild>
                <Link href={`/clubs/${club.id}/nominate`}>Nominate a movie</Link>
              </Button>
            )}
            {cycle?.phase === "VOTING" && (
              <Button size="sm" className="mt-2" asChild>
                <Link href={`/clubs/${club.id}/vote`}>Vote</Link>
              </Button>
            )}
            {cycle && (cycle.phase === "WATCHING" || cycle.phase === "COMPLETED") && (
              <Button size="sm" variant="outline" className="mt-2" asChild>
                <Link href={`/clubs/${club.id}/results/${cycle.id}`}>See voting results</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite friends</CardTitle>
          </CardHeader>
          <CardContent>
            <CopyInviteCode code={club.inviteCode} />
          </CardContent>
        </Card>
      </div>

      {cycle?.phase === "WATCHING" && cycle.watchedMovies.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Currently watching</CardTitle>
            {myMembership.role === "ADMIN" && (
              <MarkWatchedDialog clubId={club.id} cycleId={cycle.id} />
            )}
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {cycle.watchedMovies.map((wm) => {
              const poster = tmdbPosterUrl(wm.movie.posterPath, "w185");
              return (
                <Link
                  key={wm.id}
                  href={`/clubs/${club.id}/watch/${wm.id}`}
                  className="w-24 shrink-0 space-y-1.5"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={wm.movie.title}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">
                        {wm.movie.title}
                      </div>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs font-medium leading-tight">
                    {wm.movie.title}
                  </p>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <Link
            href={`/clubs/${club.id}/activity`}
            className="text-sm text-muted-foreground hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <ActivityFeedList items={recentActivity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members ({club.memberships.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {club.memberships.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <Link
                href={`/profile/${m.user.username}`}
                className="flex items-center gap-3 hover:underline"
              >
                <Avatar className="size-8">
                  <AvatarImage src={m.user.image ?? undefined} alt={m.user.name ?? ""} />
                  <AvatarFallback>{(m.user.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{m.user.name}</span>
              </Link>
              {m.role === "ADMIN" && <Badge variant="secondary">Admin</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
