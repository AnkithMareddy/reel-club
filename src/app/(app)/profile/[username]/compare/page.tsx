import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compareTaste, type SharedMovie } from "@/lib/compare";
import { tmdbPosterUrl } from "@/lib/tmdb";
import { StarRatingDisplay } from "@/components/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ComparePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();
  const myUserId = session!.user.id;

  const them = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true, image: true },
  });
  if (!them) notFound();
  if (them.id === myUserId) redirect(`/profile/${username}`);

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: myUserId, addresseeId: them.id },
        { requesterId: them.id, addresseeId: myUserId },
      ],
    },
  });
  if (!friendship) redirect(`/profile/${username}`);

  const me = await prisma.user.findUnique({
    where: { id: myUserId },
    select: { name: true, image: true },
  });
  const c = await compareTaste(myUserId, them.id);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/profile/${username}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to {them.name}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <div className="flex -space-x-3">
            <Avatar className="size-10 ring-2 ring-background">
              <AvatarImage src={me?.image ?? undefined} alt={me?.name ?? ""} />
              <AvatarFallback>{(me?.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Avatar className="size-10 ring-2 ring-background">
              <AvatarImage src={them.image ?? undefined} alt={them.name ?? ""} />
              <AvatarFallback>{(them.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">You vs. {them.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Taste match" value={c.matchPercent != null ? `${c.matchPercent}%` : "—"} />
        <StatTile label="Movies in common" value={String(c.shared.length)} />
        <StatTile label="Your films" value={String(c.myCount)} />
        <StatTile
          label={`${them.name?.split(" ")[0] ?? "Their"}’s films`}
          value={String(c.theirCount)}
        />
      </div>

      {c.shared.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No movies in common yet — once you&apos;ve both rated the same movie, the
          comparison fills in.
        </p>
      ) : (
        <>
          {c.bothLoved.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">You both loved</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4 overflow-x-auto pb-2">
                {c.bothLoved.slice(0, 8).map((s) => (
                  <PosterCell key={s.movie.id} shared={s} />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Side by side ({c.shared.length} shared)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-end gap-8 pb-1 pr-1 text-xs text-muted-foreground">
                <span>You</span>
                <span>{them.name?.split(" ")[0]}</span>
              </div>
              {c.shared.map((s) => (
                <div key={s.movie.id} className="flex items-center gap-3 rounded-md p-1.5 hover:bg-muted/50">
                  <Link href={`/movies/${s.movie.tmdbId}`} className="shrink-0">
                    <div className="relative aspect-[2/3] w-8 overflow-hidden rounded bg-muted">
                      {tmdbPosterUrl(s.movie.posterPath, "w92") ? (
                        <Image
                          src={tmdbPosterUrl(s.movie.posterPath, "w92")!}
                          alt={s.movie.title}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                  </Link>
                  <Link
                    href={`/movies/${s.movie.tmdbId}`}
                    className="min-w-0 flex-1 truncate text-sm hover:underline"
                  >
                    {s.movie.title}
                  </Link>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="w-8 text-right text-sm font-medium">
                      {(s.mine / 2).toFixed(1)}
                    </span>
                    <span className="w-8 text-right text-sm font-medium text-muted-foreground">
                      {(s.theirs / 2).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {c.disagreements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Biggest disagreements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {c.disagreements.map((s) => (
                  <div key={s.movie.id} className="flex items-center gap-3">
                    <Link href={`/movies/${s.movie.tmdbId}`} className="shrink-0">
                      <div className="relative aspect-[2/3] w-9 overflow-hidden rounded bg-muted">
                        {tmdbPosterUrl(s.movie.posterPath, "w92") ? (
                          <Image
                            src={tmdbPosterUrl(s.movie.posterPath, "w92")!}
                            alt={s.movie.title}
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/movies/${s.movie.tmdbId}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {s.movie.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {s.diff > 0
                          ? `You liked it ${(Math.abs(s.diff) / 2).toFixed(1)}★ more`
                          : `${them.name?.split(" ")[0]} liked it ${(Math.abs(s.diff) / 2).toFixed(1)}★ more`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                      <span className="flex items-center gap-1.5">
                        You <StarRatingDisplay value={Math.round(s.mine)} />
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        Them <StarRatingDisplay value={Math.round(s.theirs)} />
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your top genres</CardTitle>
              </CardHeader>
              <CardContent>
                <GenreBars genres={c.myTopGenres} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {them.name?.split(" ")[0]}&apos;s top genres
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GenreBars genres={c.theirTopGenres} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {c.onlyTheirs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {them.name?.split(" ")[0]}&apos;s favorites you haven&apos;t seen
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 overflow-x-auto pb-2">
            {c.onlyTheirs.map(({ movie, score }) => (
              <Link key={movie.id} href={`/movies/${movie.tmdbId}`} className="w-24 shrink-0 space-y-1">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted">
                  {tmdbPosterUrl(movie.posterPath, "w185") ? (
                    <Image
                      src={tmdbPosterUrl(movie.posterPath, "w185")!}
                      alt={movie.title}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : null}
                  <span className="absolute bottom-1 right-1 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur">
                    {(score / 2).toFixed(1)}★
                  </span>
                </div>
                <p className="line-clamp-2 text-xs font-medium leading-tight">{movie.title}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-3xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function GenreBars({ genres }: { genres: { name: string; count: number }[] }) {
  if (genres.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough data yet.</p>;
  }
  const max = Math.max(...genres.map((g) => g.count), 1);
  return (
    <div className="space-y-2.5">
      {genres.map((g) => (
        <div key={g.name} className="space-y-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{g.name}</span>
            <span className="text-muted-foreground">{g.count}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(4, (g.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Small helper shared by the "both loved" shelf.
function PosterCell({ shared }: { shared: SharedMovie }) {
  const poster = tmdbPosterUrl(shared.movie.posterPath, "w185");
  return (
    <Link href={`/movies/${shared.movie.tmdbId}`} className="w-24 shrink-0 space-y-1">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted">
        {poster ? (
          <Image
            src={poster}
            alt={shared.movie.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : null}
        <span className="absolute bottom-1 right-1 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur">
          {((shared.mine + shared.theirs) / 4).toFixed(1)}★
        </span>
      </div>
      <p className="line-clamp-2 text-xs font-medium leading-tight">{shared.movie.title}</p>
    </Link>
  );
}
