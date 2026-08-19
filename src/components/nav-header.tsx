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

export function NavHeader({
  user,
}: {
  user: { name: string | null; username: string | null; image: string | null };
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/clubs" className="flex items-center gap-2 font-semibold">
          <Clapperboard className="size-5" />
          Reel Club
        </Link>

        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clubs">Clubs</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/movies">
              <Search className="size-4" />
              Movies
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/lists">
              <ListOrdered className="size-4" />
              Lists
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/friends">
              <Users className="size-4" />
              Friends
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/activity">
              <Activity className="size-4" />
              Activity
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="ml-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-8">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                <AvatarFallback>
                  {(user.name ?? "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
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
        </nav>
      </div>
    </header>
  );
}
