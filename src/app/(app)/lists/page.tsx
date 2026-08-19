import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tmdbPosterUrl } from "@/lib/tmdb";
import { CreateListDialog } from "@/components/create-list-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function ListsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const lists = await prisma.movieList.findMany({
    where: { ownerId: userId },
    include: {
      items: {
        orderBy: { position: "asc" },
        take: 5,
        include: { movie: { select: { title: true, posterPath: true } } },
      },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your lists</h1>
          <p className="text-muted-foreground">
            Rankings and collections — they show up on your profile too.
          </p>
        </div>
        <CreateListDialog />
      </div>

      {lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No lists yet — make your first ranking with the button above.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lists.map((list) => (
            <Link key={list.id} href={`/lists/${list.id}`}>
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
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium leading-tight">{list.title}</h2>
                      {list.isRanked && <Badge variant="secondary">Ranked</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {list._count.items} movie{list._count.items === 1 ? "" : "s"}
                    </p>
                    {list.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {list.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
