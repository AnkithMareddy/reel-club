import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  updateClubSettings,
  removeMember,
  transferAdmin,
  leaveClub,
} from "@/lib/actions/clubs";
import { ClubForm } from "@/components/club-form";
import { DeleteClubDialog } from "@/components/delete-club-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function ClubSettingsPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!club) notFound();

  const myMembership = club.memberships.find((m) => m.userId === userId);
  if (!myMembership) redirect(`/clubs/${clubId}`);
  if (myMembership.role !== "ADMIN") redirect(`/clubs/${clubId}`);

  const boundUpdate = updateClubSettings.bind(null, clubId);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href={`/clubs/${clubId}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to {club.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Club settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Club details</CardTitle>
        </CardHeader>
        <CardContent>
          <ClubForm
            action={boundUpdate}
            submitLabel="Save changes"
            defaultValues={{
              name: club.name,
              description: club.description ?? "",
              coverImage: club.coverImage ?? "",
              scheduleType: club.scheduleType,
              scheduleIntervalDays: club.scheduleIntervalDays,
              winnersPerCycle: club.winnersPerCycle,
              nominationsPerMember: club.nominationsPerMember,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members ({club.memberships.length})</CardTitle>
          <CardDescription>Remove members or transfer admin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {club.memberships.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarImage src={m.user.image ?? undefined} alt={m.user.name ?? ""} />
                  <AvatarFallback>{(m.user.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-none">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground">@{m.user.username}</p>
                </div>
                {m.role === "ADMIN" && <Badge variant="secondary">Admin</Badge>}
              </div>
              {m.userId !== userId && (
                <div className="flex gap-2">
                  {m.role !== "ADMIN" && (
                    <form action={transferAdmin.bind(null, clubId, m.userId)}>
                      <Button type="submit" size="sm" variant="outline">
                        Make admin
                      </Button>
                    </form>
                  )}
                  <form action={removeMember.bind(null, clubId, m.userId)}>
                    <Button type="submit" size="sm" variant="ghost">
                      Remove
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <form action={leaveClub.bind(null, clubId)}>
            <Button type="submit" variant="outline">
              Leave club
            </Button>
          </form>
          <Separator orientation="vertical" className="h-6" />
          <DeleteClubDialog clubId={clubId} clubName={club.name} />
        </CardContent>
      </Card>
    </div>
  );
}
