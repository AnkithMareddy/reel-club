import Link from "next/link";
import { Activity, Clapperboard, ListOrdered, Search, Users } from "lucide-react";
import { signOut } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Shared by the desktop top bar and the mobile bottom bar. */
const NAV_ITEMS = [
  { href: "/clubs", label: "Clubs", icon: Clapperboard },
  { href: "/movies", label: "Search", icon: Search },
  { href: "/lists", label: "Lists", icon: ListOrdered },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function NavHeader({
  user,
}: {
  user: { name: string | null; username: string | null; image: string | null };
}) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <Link href="/clubs" className="flex shrink-0 items-center gap-2 font-semibold">
            <Clapperboard className="size-5" />
            Reel Club
          </Link>

          {/* Five labelled links can't fit a phone, so they move to the
              bottom bar below and only appear up here when there's room. */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Button key={href} variant="ghost" size="sm" asChild>
                <Link href={href}>
                  <Icon className="size-4" />
                  {label}
                </Link>
              </Button>
            ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-9 pointer-coarse:size-10">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                <AvatarFallback>{(user.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/profile/${user.username}`}>Your profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/onboarding">Edit profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full text-left">
                    Sign out
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Thumb-reachable tab bar, padded clear of the home indicator. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-muted-foreground transition-colors active:text-foreground"
            >
              <Icon className="size-5" />
              <span className="text-[10px] leading-none">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
