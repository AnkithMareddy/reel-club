import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tmdbPosterUrl } from "@/lib/tmdb";
import { CreateListDialog } from "@/components/create-list-dialog";
import { VisibilityIcon } from "@/components/visibility-select";
import { VISIBILITY_LABEL } from "@/lib/list-visibility";
import { visibleListsWhere } from "@/lib/list-access";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function ListsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const myLists = await prisma.movieList.findMany({
    where: {
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
    },
    include: {
      owner: { select: { id: true, name: true, username: true, image: true } },
      items: {
        orderBy: { position: "asc" },
        take: 5,
        include: { movie: { select: { title: true, posterPath: true } } },
      },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Lists from other people the viewer is allowed to see.
  const sharedLists = await prisma.movieList.findMany({
    where: {
      AND: [
        await visibleListsWhere(userId),
        { ownerId: { not: userId } },
        { collaborators: { none: { userId } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, username: true, image: true } },
      items: {
        orderBy: { position: "asc" },
        take: 5,
        include: { movie: { select: { title: true, posterPath: true } } },
      },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lists</h1>
          <p className="text-muted-foreground">
            Rankings and collections — keep them private, share with friends, or make them
            public.
          </p>
        </div>
        <CreateListDialog />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Your lists</h2>
        {myLists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No lists yet — make your first ranking with the button above.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {myLists.map((list) => (
              <ListCard key={list.id} list={list} viewerId={userId} collaborating />
            ))}
          </div>
        )}
      </section>

      {sharedLists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Shared with you</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {sharedLists.map((list) => (
              <ListCard key={list.id} list={list} viewerId={userId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type ListCardData = {
  id: string;
  title: string;
  description: string | null;
  isRanked: boolean;
  visibility: "PRIVATE" | "FRIENDS" | "PUBLIC";
  ownerId: string;
  owner: { id: string; name: string | null; username: string | null; image: string | null };
  items: { id: string; movie: { title: string; posterPath: string | null } }[];
  _count: { items: number };
};

function ListCard({
  list,
  viewerId,
  collaborating = false,
}: {
  list: ListCardData;
  viewerId: string;
  /** Viewer co-edits this list (only true in the "Your lists" section). */
  collaborating?: boolean;
}) {
  const isOwner = list.ownerId === viewerId;
  return (
    <Link href={`/lists/${list.id}`}>
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardContent className="space-y-3 pt-6">
          <div className="flex -space-x-4">
            {list.items.map((item) => (
              <div
                key={item.id}
                className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-md bg-muted ring-2 ring-background"
              >
                {tmdbPosterUrl(item.movie.posterPath, "w92") ? (
                  <Image
                    src={tmdbPosterUrl(item.movie.posterPath, "w92")!}
                    alt={item.movie.title}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : null}
              </div>
            ))}
            {list.items.length === 0 && (
              <div className="flex aspect-[2/3] w-14 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                Empty
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium leading-tight">{list.title}</h3>
              {list.isRanked && <Badge variant="secondary">Ranked</Badge>}
              {isOwner ? (
                <Badge variant="outline" className="gap-1">
                  <VisibilityIcon visibility={list.visibility} className="size-3" />
                  {VISIBILITY_LABEL[list.visibility]}
                </Badge>
              ) : collaborating ? (
                <Badge variant="outline">Collaborating</Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {!isOwner && (
                <span className="flex items-center gap-1">
                  <Avatar className="size-4">
                    <AvatarImage src={list.owner.image ?? undefined} alt={list.owner.name ?? ""} />
                    <AvatarFallback className="text-[8px]">
                      {(list.owner.name ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {list.owner.name} ·
                </span>
              )}
              <span>
                {list._count.items} movie{list._count.items === 1 ? "" : "s"}
              </span>
            </div>
            {list.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{list.description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
