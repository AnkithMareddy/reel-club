import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClubStats } from "@/lib/stats";
import { BarChart } from "@/components/bar-chart";
import { TopMoviesRow } from "@/components/top-movies-row";
import { DirectorRanking } from "@/components/director-ranking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ClubStatsPage({
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

  const stats = await getClubStats(clubId);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/clubs/${clubId}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to {club.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Club stats</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Movies rated
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.totalMovies}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Average rating
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {stats.totalMovies ? stats.avgRating.toFixed(1) : "—"}
            <span className="text-base font-normal text-muted-foreground">/10</span>
          </CardContent>
        </Card>
      </div>

      {stats.totalMovies === 0 ? (
        <p className="text-sm text-muted-foreground">
          No ratings yet — stats will fill in once members start rating watched movies.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top movies</CardTitle>
            </CardHeader>
            <CardContent>
              <TopMoviesRow movies={stats.topMovies} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ratings distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                rows={stats.distribution
                  .filter((d) => d.count > 0)
                  .map((d) => ({ label: `${(d.score / 2).toFixed(1)}★`, value: d.count }))}
                valueFormatter={(v) => `${v}`}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most-watched genres</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  rows={stats.genresByCount.slice(0, 6).map((g) => ({
                    label: g.name,
                    value: g.count,
                    sublabel: `${g.avg.toFixed(1)} avg`,
                  }))}
                  valueFormatter={(v) => `${v} watched`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Highest-rated genres</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  rows={stats.genresByAvg.slice(0, 6).map((g) => ({
                    label: g.name,
                    value: g.avg,
                    sublabel: `${g.count} rated`,
                  }))}
                  max={10}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Most-watched directors</CardTitle>
            </CardHeader>
            <CardContent>
              <DirectorRanking directors={stats.directorsByCount} />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average rating by decade</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  rows={stats.decades.map((d) => ({
                    label: d.name,
                    value: d.avg,
                    sublabel: `${d.count} movie${d.count === 1 ? "" : "s"}`,
                  }))}
                  max={10}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average rating by runtime</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  rows={stats.runtimeBuckets.map((b) => ({
                    label: b.name,
                    value: b.avg,
                    sublabel: `${b.count} movie${b.count === 1 ? "" : "s"}`,
                  }))}
                  max={10}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
