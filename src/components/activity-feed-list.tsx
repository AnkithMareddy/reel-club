import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Star, Flame, MessageSquare, UserPlus, LogIn, Trophy } from "lucide-react";
import { tmdbPosterUrl } from "@/lib/tmdb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ActivityItem } from "@/lib/activity-feed";

const ICONS = {
  JOINED_CLUB: LogIn,
  NOMINATED_MOVIE: Flame,
  RATED_MOVIE: Star,
  REVIEWED_MOVIE: MessageSquare,
  FRIEND_ADDED: UserPlus,
  CYCLE_WINNERS_ANNOUNCED: Trophy,
};

function describe(item: ActivityItem, showClubName: boolean): { text: React.ReactNode; href: string } {
  const clubSuffix = showClubName && item.club ? ` in ${item.club.name}` : "";

  switch (item.type) {
    case "JOINED_CLUB":
      return {
        text: (
          <>
            <strong>{item.user.name}</strong> joined{item.club ? ` ${item.club.name}` : " the club"}
          </>
        ),
        href: item.club ? `/clubs/${item.club.id}` : "#",
      };
    case "NOMINATED_MOVIE":
      return {
        text: (
          <>
            <strong>{item.user.name}</strong> nominated <strong>{item.movie?.title}</strong>
            {clubSuffix}
          </>
        ),
        href: item.movie ? `/movies/${item.movie.tmdbId}` : "#",
      };
    case "RATED_MOVIE": {
      const score = (item.metadata as { score?: number } | null)?.score;
      return {
        text: (
          <>
            <strong>{item.user.name}</strong> rated <strong>{item.movie?.title}</strong>
            {score ? ` ${(score / 2).toFixed(1)}/5` : ""}
            {clubSuffix}
          </>
        ),
        href: item.movie ? `/movies/${item.movie.tmdbId}` : "#",
      };
    }
    case "REVIEWED_MOVIE":
      return {
        text: (
          <>
            <strong>{item.user.name}</strong> reviewed <strong>{item.movie?.title}</strong>
            {clubSuffix}
          </>
        ),
        href:
          item.club && item.targetId
            ? `/clubs/${item.club.id}/watch/${item.targetId}`
            : item.movie
              ? `/movies/${item.movie.tmdbId}`
              : "#",
      };
    case "FRIEND_ADDED": {
      const friend = (item.metadata as { friend?: { name?: string; username?: string } } | null)
        ?.friend;
      return {
        text: (
          <>
            <strong>{item.user.name}</strong> and <strong>{friend?.name ?? "a friend"}</strong>{" "}
            became friends
          </>
        ),
        href: friend?.username ? `/profile/${friend.username}` : "#",
      };
    }
    case "CYCLE_WINNERS_ANNOUNCED":
      return {
        text: (
          <>
            <strong>{item.movie?.title}</strong> was picked as{" "}
            {item.club ? `${item.club.name}'s` : "the"} cycle winner
          </>
        ),
        href: item.movie ? `/movies/${item.movie.tmdbId}` : "#",
      };
    default:
      return { text: null, href: "#" };
  }
}

export function ActivityFeedList({
  items,
  showClubName = false,
}: {
  items: ActivityItem[];
  showClubName?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing here yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        const { text, href } = describe(item, showClubName);
        const poster = item.movie ? tmdbPosterUrl(item.movie.posterPath, "w92") : null;

        return (
          <li key={item.id} className="flex items-start gap-3">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={item.user.image ?? undefined} alt={item.user.name ?? ""} />
              <AvatarFallback>{(item.user.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-0.5">
              <Link href={href} className="text-sm hover:underline">
                <Icon className="mr-1 inline size-3.5 text-muted-foreground" />
                {text}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(item.createdAt, { addSuffix: true })}
              </p>
            </div>
            {poster && (
              <Link
                href={href}
                className="relative aspect-[2/3] w-8 shrink-0 overflow-hidden rounded bg-muted"
              >
                <Image src={poster} alt="" fill sizes="32px" className="object-cover" />
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
