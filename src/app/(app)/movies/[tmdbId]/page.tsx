import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCacheMovie, ensureCastIds } from "@/lib/movies";
import { tmdbBackdropUrl, tmdbPosterUrl, getWatchProviders } from "@/lib/tmdb";
import { WatchProvidersSection } from "@/components/watch-providers";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReviewCard } from "@/components/review-card";
import { Star } from "lucide-react";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = await params;
  const id = Number(tmdbId);
  if (!Number.isFinite(id)) notFound();

  const session = await auth();
  let movie;
  try {
    movie = await getOrCacheMovie(id);
  } catch {
    notFound();
  }

  const [cast, watchProviders] = await Promise.all([
    ensureCastIds(movie),
    getWatchProviders(id),
  ]);
  const backdrop = tmdbBackdropUrl(movie.backdropPath);
  const poster = tmdbPosterUrl(movie.posterPath, "w500");
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

  const clubAgg = session?.user
    ? await prisma.rating.aggregate({
        where: {
          movieId: movie.id,
          club: { memberships: { some: { userId: session.user.id } } },
        },
        _avg: { score: true },
        _count: true,
      })
    : null;

  const myRatings = session?.user
    ? await prisma.rating.findMany({
        where: { movieId: movie.id, userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        select: { score: true },
      })
    : [];
  const myLatestScore = myRatings[0]?.score ?? null;

  const reviews = session?.user
    ? await prisma.review.findMany({
        where: {
          movieId: movie.id,
          watchedMovie: { club: { memberships: { some: { userId: session.user.id } } } },
        },
        include: {
          user: { select: { name: true, username: true, image: true } },
          likes: { select: { userId: true } },
          comments: {
            include: { user: { select: { name: true, username: true, image: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  return (
    <div className="space-y-6">
      {backdrop && (
        // Full-bleed plate: breaks out of the centred column to the viewport
        // edges, then dissolves into the page so the title sits on darkness.
        <div className="relative left-1/2 -mt-6 h-60 w-screen -translate-x-1/2 overflow-hidden bg-muted sm:h-80">
          <Image src={backdrop} alt="" fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="poster-glow relative mx-auto aspect-[2/3] w-48 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border sm:mx-0">
          {poster ? (
            <Image src={poster} alt={movie.title} fill sizes="192px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center text-sm text-muted-foreground">
              {movie.title}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {movie.title} {year && <span className="text-muted-foreground">({year})</span>}
            </h1>
            {movie.directors.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Directed by{" "}
                {movie.directors.map((d, i) => (
                  <span key={d.id}>
                    {i > 0 && ", "}
                    <Link href={`/people/${d.tmdbId}`} className="hover:underline">
                      {d.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genres.map((g) => (
              <Badge key={g.id} variant="secondary">
                {g.name}
              </Badge>
            ))}
            {movie.runtime && <Badge variant="outline">{movie.runtime} min</Badge>}
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            {myLatestScore != null && (
              <div>
                <p className="text-muted-foreground">Your rating</p>
                <p className="flex items-center gap-1 font-medium text-primary">
                  <Star className="size-4 fill-current" />
                  {(myLatestScore / 2).toFixed(1)}/5
                  {myRatings.length > 1 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      ({myRatings.length} watches)
                    </span>
                  )}
                </p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">TMDB rating</p>
              <p className="flex items-center gap-1 font-medium">
                <Star className="size-4 fill-current" />
                {movie.tmdbRating ? movie.tmdbRating.toFixed(1) : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">IMDb rating</p>
              <p className="flex items-center gap-1 font-medium">
                <Star className="size-4 fill-current" />
                {movie.imdbRating ? movie.imdbRating.toFixed(1) : "—"}
              </p>
              {movie.imdbId && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdbId}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground underline"
                >
                  View on IMDb
                </a>
              )}
            </div>
            {clubAgg && clubAgg._count > 0 && (
              <div>
                <p className="text-muted-foreground">Your clubs&apos; rating</p>
                <p className="flex items-center gap-1 font-medium">
                  <Star className="size-4 fill-current" />
                  {clubAgg._avg.score ? (clubAgg._avg.score / 2).toFixed(1) : "—"}/5
                  <span className="text-xs font-normal text-muted-foreground">
                    ({clubAgg._count})
                  </span>
                </p>
              </div>
            )}
          </div>

          {movie.synopsis && <p className="text-sm leading-relaxed">{movie.synopsis}</p>}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Where to watch</h2>
        <WatchProvidersSection providers={watchProviders} title={movie.title} />
      </div>

      {cast.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Cast</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {cast.slice(0, 10).map((c) => {
              const inner = (
                <>
                  <Avatar className="mx-auto size-16 transition-transform group-hover:scale-105">
                    <AvatarImage
                      src={c.profilePath ? (tmdbPosterUrl(c.profilePath, "w185") ?? undefined) : undefined}
                      alt={c.name}
                    />
                    <AvatarFallback>{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="mt-1 line-clamp-1 text-xs font-medium">{c.name}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{c.character}</p>
                </>
              );
              return c.id != null ? (
                <Link
                  key={`${c.name}-${c.order}`}
                  href={`/people/${c.id}`}
                  className="group w-24 shrink-0 text-center"
                >
                  {inner}
                </Link>
              ) : (
                <div key={`${c.name}-${c.order}`} className="w-24 shrink-0 text-center">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Reviews from your clubs</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No one in your clubs has reviewed this yet.
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <ReviewCard
                key={r.id}
                revalidatePathTarget={`/movies/${tmdbId}`}
                review={{
                  id: r.id,
                  body: r.body,
                  containsSpoilers: r.containsSpoilers,
                  user: r.user,
                  likeCount: r.likes.length,
                  likedByMe: r.likes.some((l) => l.userId === session?.user.id),
                  comments: r.comments,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
