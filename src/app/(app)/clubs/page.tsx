import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { JoinClubForm } from "@/components/join-club-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PHASE_LABEL: Record<string, string> = {
  NOMINATING: "Nominating",
  VOTING: "Voting",
  WATCHING: "Watching",
  COMPLETED: "Completed",
};

export default async function ClubsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const memberships = await prisma.clubMembership.findMany({
    where: { userId },
    include: {
      club: {
        include: {
          _count: { select: { memberships: true } },
          cycles: { orderBy: { cycleNumber: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your clubs</h1>
          <p className="text-muted-foreground">Nominate, vote, and watch together.</p>
        </div>
        <Button asChild>
          <Link href="/clubs/new">Create a club</Link>
        </Button>
      </div>

      <JoinClubForm />

      {memberships.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You&apos;re not in any clubs yet — create one or join with an invite code.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map(({ club, role }) => {
            const cycle = club.cycles[0];
            return (
              <Link key={club.id} href={`/clubs/${club.id}`}>
                <Card className="h-full overflow-hidden transition-colors hover:border-foreground/30">
                  {club.coverImage ? (
                    <div className="relative h-32 w-full bg-muted">
                      <Image
                        src={club.coverImage}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="h-32 w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
                  )}
                  <CardContent className="space-y-2 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-medium leading-tight">{club.name}</h2>
                      {role === "ADMIN" && <Badge variant="secondary">Admin</Badge>}
                    </div>
                    {club.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {club.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <span>{club._count.memberships} members</span>
                      {cycle && (
                        <>
                          <span>·</span>
                          <span>{PHASE_LABEL[cycle.phase] ?? cycle.phase}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
