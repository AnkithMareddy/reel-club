import { auth } from "@/auth";
import { getFriendsActivity } from "@/lib/activity-feed";
import { ActivityFeedList } from "@/components/activity-feed-list";

export default async function ActivityPage() {
  const session = await auth();
  const items = await getFriendsActivity(session!.user.id, 50);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">From your clubs and friends.</p>
      </div>
      <ActivityFeedList items={items} showClubName />
    </div>
  );
}
