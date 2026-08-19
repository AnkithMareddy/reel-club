import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ListEditor, type ListItemRow } from "@/components/list-editor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const list = await prisma.movieList.findUnique({
    where: { id: listId },
    include: {
      owner: { select: { id: true, name: true, username: true, image: true } },
      items: {
        orderBy: { position: "asc" },
        include: {
          movie: { select: { tmdbId: true, title: true, posterPath: true, releaseDate: true } },
        },
      },
    },
  });
  if (!list) notFound();

  const editable = list.ownerId === userId;

  // Viewer's own scores decorate the rows regardless of whose list it is.
  const myRatings = await prisma.rating.findMany({
    where: { userId, movieId: { in: list.items.map((i) => i.movieId) } },
    orderBy: { updatedAt: "asc" },
    select: { movieId: true, score: true },
  });
  const myScoreByMovie = new Map(myRatings.map((r) => [r.movieId, r.score]));

  const rows: ListItemRow[] = list.items.map((item) => ({
    id: item.id,
    position: item.position,
    tmdbId: item.movie.tmdbId,
    title: item.movie.title,
    posterPath: item.movie.posterPath,
    year: item.movie.releaseDate ? new Date(item.movie.releaseDate).getFullYear() : null,
    myScore: myScoreByMovie.get(item.movieId) ?? null,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/lists" className="text-sm text-muted-foreground hover:underline">
          ← All lists
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{list.title}</h1>
          {list.isRanked && <Badge variant="secondary">Ranked</Badge>}
        </div>
        {list.description && <p className="mt-1 text-muted-foreground">{list.description}</p>}
        <Link
          href={`/profile/${list.owner.username}`}
          className="mt-2 flex w-fit items-center gap-2 text-sm text-muted-foreground hover:underline"
        >
          <Avatar className="size-5">
            <AvatarImage src={list.owner.image ?? undefined} alt={list.owner.name ?? ""} />
            <AvatarFallback className="text-[9px]">
              {(list.owner.name ?? "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {list.owner.name} · {list.items.length} movie{list.items.length === 1 ? "" : "s"}
        </Link>
      </div>

      <ListEditor
        listId={list.id}
        listTitle={list.title}
        listDescription={list.description ?? ""}
        isRanked={list.isRanked}
        items={rows}
        editable={editable}
      />
    </div>
  );
}
