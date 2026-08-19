import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tmdbPosterUrl } from "@/lib/tmdb";
import { NominateMovieSearch } from "@/components/nominate-movie-search";
import { CloseNominationsDialog } from "@/components/close-nominations-dialog";
import { RemoveNominationButton } from "@/components/remove-nomination-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function NominatePage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) notFound();

  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (!membership) redirect(`/clubs/${clubId}`);

  const cycle = await prisma.cycle.findFirst({
    where: { clubId },
    orderBy: { cycleNumber: "desc" },
  });
  if (!cycle || cycle.phase !== "NOMINATING") redirect(`/clubs/${clubId}`);

  const nominations = await prisma.nomination.findMany({
    where: { cycleId: cycle.id },
    include: {
      movie: true,
      nominatedBy: { select: { id: true, name: true, username: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const myCount = nominations.filter((n) => n.nominatedById === userId).length;
  const remaining = Math.max(0, club.nominationsPerMember - myCount);

  const memberships = await prisma.clubMembership.findMany({
    where: { clubId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });
  // Caller first so the default selection is themselves.
  const nominatorOptions = [...memberships]
    .sort((a, b) => (a.userId === userId ? -1 : b.userId === userId ? 1 : 0))
    .map((m) => ({
      userId: m.userId,
      name: m.user.name ?? "Unnamed",
      used: nominations.filter((n) => n.nominatedById === m.userId).length,
      limit: club.nominationsPerMember,
    }));

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/clubs/${clubId}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to {club.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Nominate a movie</h1>
        <p className="text-muted-foreground">
          Cycle {cycle.cycleNumber} · You have {remaining} of {club.nominationsPerMember}{" "}
          nomination{club.nominationsPerMember === 1 ? "" : "s"} left.
        </p>
      </div>

      <NominateMovieSearch
        clubId={clubId}
        cycleId={cycle.id}
        disabledTmdbIds={nominations.map((n) => n.movie.tmdbId)}
        remaining={remaining}
        isAdmin={membership.role === "ADMIN"}
        members={nominatorOptions}
        currentUserId={userId}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">
            Nominations ({nominations.length})
          </h2>
          {membership.role === "ADMIN" && (
            <CloseNominationsDialog
              clubId={clubId}
              cycleId={cycle.id}
              nominationCount={nominations.length}
            />
          )}
        </div>

        {nominations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No nominations yet — search above to add the first one.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {nominations.map((n) => {
              const poster = tmdbPosterUrl(n.movie.posterPath);
              const canRemove = n.nominatedById === userId || membership.role === "ADMIN";
              return (
                <div key={n.id} className="group relative space-y-1.5">
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={n.movie.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 20vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                        {n.movie.title}
                      </div>
                    )}
                    {canRemove && <RemoveNominationButton clubId={clubId} nominationId={n.id} />}
                  </div>
                  <p className="line-clamp-1 text-sm font-medium leading-tight">{n.movie.title}</p>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="size-4">
                      <AvatarImage
                        src={n.nominatedBy.image ?? undefined}
                        alt={n.nominatedBy.name ?? ""}
                      />
                      <AvatarFallback className="text-[8px]">
                        {(n.nominatedBy.name ?? "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {n.nominatedBy.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
