import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  respondToFriendRequest,
  cancelOrRemoveFriendship,
  sendFriendRequestToUser,
} from "@/lib/actions/friends";
import { FriendSearch } from "@/components/friend-search";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function FriendsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: { id: true, name: true, username: true, image: true } },
      addressee: { select: { id: true, name: true, username: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const accepted = friendships.filter((f) => f.status === "ACCEPTED");
  const receivedPending = friendships.filter(
    (f) => f.status === "PENDING" && f.addresseeId === userId,
  );
  const sentPending = friendships.filter(
    (f) => f.status === "PENDING" && f.requesterId === userId,
  );

  const other = (f: (typeof friendships)[number]) =>
    f.requesterId === userId ? f.addressee : f.requester;

  // Club-mates who aren't already friends (or pending) make natural suggestions.
  const connectedIds = new Set(
    friendships.flatMap((f) => [f.requesterId, f.addresseeId]),
  );
  const myClubIds = (
    await prisma.clubMembership.findMany({ where: { userId }, select: { clubId: true } })
  ).map((m) => m.clubId);
  const clubmates = await prisma.clubMembership.findMany({
    where: {
      clubId: { in: myClubIds },
      userId: { not: userId },
      user: { username: { not: null } },
    },
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
      club: { select: { name: true } },
    },
  });
  const suggestions = [
    ...new Map(
      clubmates
        .filter((m) => !connectedIds.has(m.userId))
        .map((m) => [m.userId, { user: m.user, clubName: m.club.name }]),
    ).values(),
  ].slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Friends</h1>
        <p className="text-muted-foreground">
          Add friends to invite them to clubs and share your reviews with them.
        </p>
      </div>

      <FriendSearch />

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">People in your clubs</CardTitle>
            <CardDescription>Club-mates you haven&apos;t added yet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map(({ user, clubName }) => (
              <div key={user.id} className="flex items-center justify-between gap-3">
                <Link
                  href={`/profile/${user.username}`}
                  className="flex min-w-0 items-center gap-3 hover:underline"
                >
                  <Avatar className="size-9">
                    <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                    <AvatarFallback>
                      {(user.name ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-none">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{user.username} · {clubName}
                    </p>
                  </div>
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await sendFriendRequestToUser(user.id);
                  }}
                >
                  <Button type="submit" size="sm" variant="outline">
                    Add friend
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {receivedPending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Friend requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {receivedPending.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3">
                <UserRow user={other(f)} />
                <div className="flex gap-2">
                  <form action={respondToFriendRequest.bind(null, f.id, true)}>
                    <Button type="submit" size="sm">
                      Accept
                    </Button>
                  </form>
                  <form action={respondToFriendRequest.bind(null, f.id, false)}>
                    <Button type="submit" size="sm" variant="ghost">
                      Decline
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your friends ({accepted.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {accepted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No friends yet — add one above.
            </p>
          ) : (
            accepted.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3">
                <UserRow user={other(f)} />
                <form action={cancelOrRemoveFriendship.bind(null, f.id)}>
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {sentPending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sent requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sentPending.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3">
                <UserRow user={other(f)} />
                <form action={cancelOrRemoveFriendship.bind(null, f.id)}>
                  <Button type="submit" size="sm" variant="ghost">
                    Cancel
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UserRow({
  user,
}: {
  user: { name: string | null; username: string | null; image: string | null };
}) {
  return (
    <Link
      href={`/profile/${user.username}`}
      className="flex items-center gap-3 hover:underline"
    >
      <Avatar className="size-9">
        <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
        <AvatarFallback>{(user.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium leading-none">{user.name}</p>
        <p className="text-xs text-muted-foreground">@{user.username}</p>
      </div>
    </Link>
  );
}
