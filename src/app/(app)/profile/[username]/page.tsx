import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserStats } from "@/lib/stats";
import { visibleListsWhere } from "@/lib/list-access";
import { tmdbPosterUrl } from "@/lib/tmdb";
import { BarChart } from "@/components/bar-chart";
import { StarRatingDisplay } from "@/components/star-rating";
import { LogMovieDialog } from "@/components/log-movie-dialog";
import { TopMoviesRow } from "@/components/top-movies-row";
import { PersonRanking } from "@/components/person-ranking";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      createdAt: true,
      _count: { select: { clubMembers: true, ratings: true, reviews: true } },
    },
  });
  if (!user) notFound();

  const stats = await getUserStats(user.id);
  // Distinct movies, not rating rows — the same film can be logged more than
  // once (club watch plus a Letterboxd import, or a rewatch).
  const distinctRated = (
    await prisma.rating.findMany({
      where: { userId: user.id },
      distinct: ["movieId"],
      select: { movieId: true },
    })
  ).length;
  const isSelf = session?.user.id === user.id;
  const friendship = isSelf
    ? null
    : await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: session?.user.id, addresseeId: user.id },
            { requesterId: user.id, addresseeId: session?.user.id },
          ],
        },
      });

  const viewerClubIds = session?.user
    ? await prisma.clubMembership
        .findMany({ where: { userId: session.user.id }, select: { clubId: true } })
        .then((rows) => rows.map((r) => r.clubId))
    : [];

  const clubMemberships = await prisma.clubMembership.findMany({
    where: isSelf ? { userId: user.id } : { userId: user.id, clubId: { in: viewerClubIds } },
    include: { club: { select: { id: true, name: true, coverImage: true } } },
    orderBy: { joinedAt: "desc" },
  });

  // Only lists this viewer is allowed to see (their own, public, or
  // friends-only when they're an accepted friend).
  const lists = session?.user
    ? await prisma.movieList.findMany({
        where: {
          AND: [{ ownerId: user.id }, await visibleListsWhere(session.user.id)],
        },
        include: { _count: { select: { items: true } } },
        orderBy: { updatedAt: "desc" },
        take: 6,
      })
    : [];

  const canViewHistory = isSelf || friendship?.status === "ACCEPTED";
  const recentRatings = canViewHistory
    ? await prisma.rating.findMany({
        where: { userId: user.id },
        include: { movie: { select: { title: true, posterPath: true, tmdbId: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 shrink-0 sm:size-20">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback className="text-lg">
              {(user.name ?? "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{user.name}</h1>
              {isSelf && <Badge variant="secondary">You</Badge>}
              {!isSelf && friendship?.status === "ACCEPTED" && (
                <Badge variant="secondary">Friend</Badge>
              )}
            </div>
            <p className="text-muted-foreground">@{user.username}</p>
            {user.bio && <p className="max-w-md text-sm">{user.bio}</p>}
          </div>
        </div>
        {isSelf ? (
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <LogMovieDialog />
            <Button variant="outline" size="sm" asChild>
              <Link href="/import/letterboxd">Import from Letterboxd</Link>
            </Button>
          </div>
        ) : (
          friendship?.status === "ACCEPTED" && (
            <Button variant="outline" size="sm" asChild className="w-fit sm:shrink-0">
              <Link href={`/profile/${user.username}/compare`}>Compare taste</Link>
            </Button>
          )
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{user._count.clubMembers}</strong> clubs
        </span>
        <span>
          <strong className="text-foreground">{distinctRated}</strong> movies rated
        </span>
        <span>
          <strong className="text-foreground">{user._count.reviews}</strong> reviews
        </span>
      </div>

      {clubMemberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isSelf ? "Clubs" : "Clubs in common"} ({clubMemberships.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {clubMemberships.map((m) => (
              <Link
                key={m.club.id}
                href={`/clubs/${m.club.id}`}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                {m.club.coverImage ? (
                  <div className="relative size-6 shrink-0 overflow-hidden rounded bg-muted">
                    <Image src={m.club.coverImage} alt="" fill sizes="24px" className="object-cover" />
                  </div>
                ) : null}
                {m.club.name}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {lists.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Lists ({lists.length})</CardTitle>
            {isSelf && (
              <Link href="/lists" className="text-sm text-muted-foreground hover:underline">
                Manage →
              </Link>
            )}
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {lists.map((l) => (
              <Link
                key={l.id}
                href={`/lists/${l.id}`}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                {l.title}
                <span className="text-xs text-muted-foreground">{l._count.items}</span>
                {l.isRanked && <Badge variant="secondary">Ranked</Badge>}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {canViewHistory && recentRatings.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Rating history</CardTitle>
            <Link
              href={`/profile/${user.username}/films`}
              className="text-sm text-muted-foreground hover:underline"
            >
              See all {distinctRated} →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentRatings.map((r) => (
              <Link
                key={r.id}
                href={`/movies/${r.movie.tmdbId}`}
                className="flex items-center gap-3 hover:underline"
              >
                <div className="relative aspect-[2/3] w-8 shrink-0 overflow-hidden rounded bg-muted">
                  {tmdbPosterUrl(r.movie.posterPath, "w92") ? (
                    <Image
                      src={tmdbPosterUrl(r.movie.posterPath, "w92")!}
                      alt={r.movie.title}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <span className="flex-1 text-sm">{r.movie.title}</span>
                <StarRatingDisplay value={r.score} />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {stats.totalMovies === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isSelf ? "You haven't" : `${user.name} hasn't`} rated any movies yet.
        </p>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top movies</CardTitle>
            </CardHeader>
            <CardContent>
              <TopMoviesRow movies={stats.topMovies} />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ratings distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  rows={stats.distribution
                    .filter((d) => d.count > 0)
                    .map((d) => ({ label: `${(d.score / 2).toFixed(1)}★`, value: d.count, movies: d.movies }))}
                  format="integer"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By decade</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  rows={stats.decades.map((d) => ({
                    label: d.name,
                    value: d.avg,
                    sublabel: `${d.count} movie${d.count === 1 ? "" : "s"}`,
                    movies: d.movies,
                  }))}
                  max={10}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Favorite genres (by volume)</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  rows={stats.genresByCount.slice(0, 6).map((g) => ({
                    label: g.name,
                    value: g.count,
                    sublabel: `${g.avg.toFixed(1)} avg`,
                    movies: g.movies,
                  }))}
                  format="integer"
                  unit="watched"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Favorite genres (by rating)</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  rows={stats.genresByAvg.slice(0, 6).map((g) => ({
                    label: g.name,
                    value: g.avg,
                    sublabel: `${g.count} rated`,
                    movies: g.movies,
                  }))}
                  max={10}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Favorite directors</CardTitle>
            </CardHeader>
            <CardContent>
              <PersonRanking people={stats.directorsByCount} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Favorite actors</CardTitle>
            </CardHeader>
            <CardContent>
              <PersonRanking people={stats.actorsByCount} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
