import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClubLeaderboard } from "@/lib/leaderboard";
import { tmdbPosterUrl } from "@/lib/tmdb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Flame, Frown, ThumbsUp, Vote as VoteIcon } from "lucide-react";

export default async function LeaderboardPage({
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

  const board = await getClubLeaderboard(clubId);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/clubs/${clubId}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to {club.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
      </div>

      {board.allTimeFavorite && (
        <Card className="overflow-hidden border-primary/30">
          <div className="flex gap-4 p-4 sm:gap-6">
            <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:w-32">
              {tmdbPosterUrl(board.allTimeFavorite.movie.posterPath) ? (
                <Image
                  src={tmdbPosterUrl(board.allTimeFavorite.movie.posterPath)!}
                  alt={board.allTimeFavorite.movie.title}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Badge className="gap-1">
                <Star className="size-3 fill-current" />
                The Club&apos;s All-Time Favorite
              </Badge>
              <h2 className="text-xl font-semibold">{board.allTimeFavorite.movie.title}</h2>
              <p className="text-sm text-muted-foreground">
                {(board.allTimeFavorite.avg / 2).toFixed(1)}/5 average ·{" "}
                {board.allTimeFavorite.count} rating{board.allTimeFavorite.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top-rated movies, all time</CardTitle>
        </CardHeader>
        <CardContent>
          {board.topRatedMovies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ratings yet.</p>
          ) : (
            <ol className="space-y-3">
              {board.topRatedMovies.map((entry, i) => (
                <li key={entry.movie.id} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-sm font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                  <Link
                    href={`/movies/${entry.movie.tmdbId}`}
                    className="flex flex-1 items-center justify-between gap-3 hover:underline"
                  >
                    <span className="text-sm font-medium">{entry.movie.title}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {(entry.avg / 2).toFixed(1)}/5 · {entry.count} rating
                      {entry.count === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {board.cycleHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movie of the Cycle history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {board.cycleHistory.map((cycle) =>
                cycle.watchedMovies.map((wm) => {
                  const poster = tmdbPosterUrl(wm.movie.posterPath);
                  return (
                    <div key={wm.id} className="w-24 shrink-0 space-y-1.5">
                      <Link href={`/clubs/${clubId}/watch/${wm.id}`} className="block space-y-1.5">
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
                          {poster ? (
                            <Image
                              src={poster}
                              alt={wm.movie.title}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : null}
                          <Badge className="absolute left-1 top-1" variant="secondary">
                            Cycle {cycle.cycleNumber}
                          </Badge>
                        </div>
                        <p className="line-clamp-2 text-xs font-medium leading-tight">
                          {wm.movie.title}
                        </p>
                      </Link>
                      <Link
                        href={`/clubs/${clubId}/results/${cycle.id}`}
                        className="block text-[11px] text-muted-foreground hover:underline"
                      >
                        Voting results →
                      </Link>
                    </div>
                  );
                }),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-medium">Member leaderboard</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MemberCard
            icon={<Frown className="size-4" />}
            label="Harshest critic"
            entry={board.harshestCritic}
            format={(e) => `${(e.avg / 2).toFixed(1)}/5 avg`}
          />
          <MemberCard
            icon={<ThumbsUp className="size-4" />}
            label="Most enthusiastic"
            entry={board.mostEnthusiastic}
            format={(e) => `${(e.avg / 2).toFixed(1)}/5 avg`}
          />
          <MemberCard
            icon={<Flame className="size-4" />}
            label="Most nominations"
            entry={board.mostNominations}
            format={(e) => `${e.count} nomination${e.count === 1 ? "" : "s"}`}
          />
          <MemberCard
            icon={<VoteIcon className="size-4" />}
            label="Most votes cast"
            entry={board.mostVotes}
            format={(e) => `${e.count} cycle${e.count === 1 ? "" : "s"} voted in`}
          />
        </div>
      </div>
    </div>
  );
}

function MemberCard<
  E extends { user: { name: string | null; username: string | null; image: string | null } },
>({
  icon,
  label,
  entry,
  format,
}: {
  icon: React.ReactNode;
  label: string;
  entry: E | null;
  format: (entry: E) => string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-1.5 space-y-0 pb-2">
        {icon}
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {entry ? (
          <Link
            href={`/profile/${entry.user.username}`}
            className="flex items-center gap-2.5 hover:underline"
          >
            <Avatar className="size-8">
              <AvatarImage src={entry.user.image ?? undefined} alt={entry.user.name ?? ""} />
              <AvatarFallback>{(entry.user.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium leading-none">{entry.user.name}</p>
              <p className="text-xs text-muted-foreground">{format(entry)}</p>
            </div>
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">Not enough data yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
