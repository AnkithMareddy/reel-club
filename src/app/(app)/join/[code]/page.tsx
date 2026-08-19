import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { joinClubById } from "@/lib/actions/clubs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const club = await prisma.club.findUnique({
    where: { inviteCode: code.toUpperCase() },
    include: { _count: { select: { memberships: true } } },
  });
  if (!club) notFound();

  const existing = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId: club.id } },
  });
  if (existing) redirect(`/clubs/${club.id}`);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{club.name}</CardTitle>
          <CardDescription>
            {club._count.memberships} member{club._count.memberships === 1 ? "" : "s"}
            {club.description ? ` · ${club.description}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await joinClubById(club.id, userId);
              redirect(`/clubs/${club.id}`);
            }}
          >
            <Button type="submit" className="w-full">
              Join {club.name}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
