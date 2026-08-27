import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCycleResults } from "@/lib/cycle-results";
import { tmdbPosterUrl } from "@/lib/tmdb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function CycleResultsPage({
  params,
}: {
  params: Promise<{ clubId: string; cycleId: string }>;
}) {
  const { clubId, cycleId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
  if (!club) notFound();

  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) redirect(`/clubs/${clubId}`);

  const results = await getCycleResults(clubId, cycleId);
  if (!results) notFound();

  const maxVotes = Math.max(...results.rows.map((r) => r.votes), 1);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/clubs/${clubId}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to {club.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cycle {results.cycleNumber} results
        </h1>
        <p className="text-muted-foreground">
          {results.voterCount} of {results.memberCount} member
          {results.memberCount === 1 ? "" : "s"} voted
          {results.votingEndAt
            ? ` · closed ${new Date(results.votingEndAt).toLocaleDateString()}`
            : ""}
        </p>
      </div>

      <div className="space-y-3">
        {results.rows.map((row, i) => (
          <Card key={row.nominationId} className={row.isWinner ? "border-primary/50" : undefined}>
            <CardContent className="space-y-2 py-3">
              <div className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <Link href={`/movies/${row.tmdbId}`} className="shrink-0">
                  <div className="relative aspect-[2/3] w-11 overflow-hidden rounded bg-muted">
                    {tmdbPosterUrl(row.posterPath, "w92") ? (
                      <Image
                        src={tmdbPosterUrl(row.posterPath, "w92")!}
                        alt={row.title}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                </Link>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/movies/${row.tmdbId}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {row.title}
                    </Link>
                    {row.isWinner && (
                      <Badge className="gap-1">
                        <Trophy className="size-3" />
                        Winner
                      </Badge>
                    )}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${row.isWinner ? "bg-primary" : "bg-muted-foreground/40"}`}
                      style={{ width: `${Math.max(3, (row.votes / maxVotes) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nominated by {row.nominatedBy.name}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold">
                  {row.votes} vote{row.votes === 1 ? "" : "s"}
                </span>
              </div>

              {row.voters.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pl-8">
                  <span className="text-xs text-muted-foreground">Voted by</span>
                  {row.voters.map((v) => (
                    <Link
                      key={v.id}
                      href={`/profile/${v.username}`}
                      className="flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs hover:bg-muted"
                    >
                      <Avatar className="size-4">
                        <AvatarImage src={v.image ?? undefined} alt={v.name ?? ""} />
                        <AvatarFallback className="text-[8px]">
                          {(v.name ?? "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {v.name}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
