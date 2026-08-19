import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tmdbPosterUrl } from "@/lib/tmdb";
import { RatingReviewForm } from "@/components/rating-review-form";
import { ReviewCard } from "@/components/review-card";
import { StarRatingDisplay } from "@/components/star-rating";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ clubId: string; watchedMovieId: string }>;
}) {
  const { clubId, watchedMovieId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) redirect(`/clubs/${clubId}`);

  const watchedMovie = await prisma.watchedMovie.findUnique({
    where: { id: watchedMovieId },
    include: { movie: true, club: { select: { id: true, name: true } } },
  });
  if (!watchedMovie || watchedMovie.clubId !== clubId || !watchedMovie.club) notFound();

  const [ratingAgg, reviews, myRating, myReview] = await Promise.all([
    prisma.rating.aggregate({
      where: { watchedMovieId },
      _avg: { score: true },
      _count: true,
    }),
    prisma.review.findMany({
      where: { watchedMovieId },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        likes: { select: { userId: true } },
        comments: {
          include: { user: { select: { name: true, username: true, image: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rating.findUnique({ where: { userId_watchedMovieId: { userId, watchedMovieId } } }),
    prisma.review.findUnique({ where: { userId_watchedMovieId: { userId, watchedMovieId } } }),
  ]);

  const poster = tmdbPosterUrl(watchedMovie.movie.posterPath, "w342");
  const otherReviews = reviews.filter((r) => r.userId !== userId);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href={`/clubs/${clubId}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to {watchedMovie.club.name}
        </Link>
      </div>

      <div className="flex gap-4">
        <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-md bg-muted">
          {poster ? (
            <Image
              src={poster}
              alt={watchedMovie.movie.title}
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            <Link href={`/movies/${watchedMovie.movie.tmdbId}`} className="hover:underline">
              {watchedMovie.movie.title}
            </Link>
          </h1>
          {ratingAgg._count > 0 ? (
            <div className="flex items-center gap-2">
              <StarRatingDisplay value={Math.round(ratingAgg._avg.score ?? 0)} />
              <span className="text-sm text-muted-foreground">
                {((ratingAgg._avg.score ?? 0) / 2).toFixed(1)} · {ratingAgg._count} rating
                {ratingAgg._count === 1 ? "" : "s"}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No ratings yet from {watchedMovie.club.name}.</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {myRating ? "Edit your rating & review" : "Rate & review"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RatingReviewForm
            clubId={clubId}
            watchedMovieId={watchedMovieId}
            defaultScore={myRating?.score ?? 0}
            defaultBody={myReview?.body ?? ""}
            defaultSpoilers={myReview?.containsSpoilers ?? false}
            defaultVisibility={myReview?.visibility ?? "CLUB_AND_FRIENDS"}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">
          Reviews from {watchedMovie.club.name} ({reviews.length})
        </h2>
        {otherReviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other reviews yet.</p>
        ) : (
          otherReviews.map((r) => (
            <ReviewCard
              key={r.id}
              revalidatePathTarget={`/clubs/${clubId}/watch/${watchedMovieId}`}
              review={{
                id: r.id,
                body: r.body,
                containsSpoilers: r.containsSpoilers,
                user: r.user,
                likeCount: r.likes.length,
                likedByMe: r.likes.some((l) => l.userId === userId),
                comments: r.comments,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
