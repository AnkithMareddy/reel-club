import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FilmsHistoryClient, type FilmRow } from "@/components/films-history-client";

export default async function FilmsHistoryPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true },
  });
  if (!user) notFound();

  const isSelf = session?.user.id === user.id;
  if (!isSelf) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: session?.user.id, addresseeId: user.id },
          { requesterId: user.id, addresseeId: session?.user.id },
        ],
      },
    });
    if (!friendship) redirect(`/profile/${username}`);
  }

  const ratings = await prisma.rating.findMany({
    where: { userId: user.id },
    include: {
      movie: {
        select: {
          tmdbId: true,
          title: true,
          posterPath: true,
          releaseDate: true,
          genres: { select: { name: true } },
          directors: { select: { name: true } },
        },
      },
      watchedMovie: {
        select: {
          id: true,
          watchedAt: true,
          loggedById: true,
          reviews: { where: { userId: user.id }, select: { body: true } },
        },
      },
    },
    orderBy: { watchedMovie: { watchedAt: "desc" } },
  });

  const rows: FilmRow[] = ratings.map((r) => ({
    ratingId: r.id,
    watchedMovieId: r.watchedMovie.id,
    tmdbId: r.movie.tmdbId,
    title: r.movie.title,
    posterPath: r.movie.posterPath,
    year: r.movie.releaseDate ? new Date(r.movie.releaseDate).getFullYear() : null,
    genres: r.movie.genres.map((g) => g.name),
    directors: r.movie.directors.map((d) => d.name),
    score: r.score,
    body: r.watchedMovie.reviews[0]?.body ?? "",
    watchedAt: r.watchedMovie.watchedAt.toISOString().slice(0, 10),
    isPersonal: r.watchedMovie.loggedById === user.id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/profile/${username}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to {user.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSelf ? "Your films" : `${user.name}'s films`} ({rows.length})
        </h1>
      </div>
      <FilmsHistoryClient rows={rows} editable={isSelf} />
    </div>
  );
}
