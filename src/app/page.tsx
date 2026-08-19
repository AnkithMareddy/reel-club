import Link from "next/link";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clapperboard,
  Film,
  ListChecks,
  Star,
  Users,
  Trophy,
  Sparkles,
} from "lucide-react";

const STEPS = [
  {
    icon: Film,
    title: "Nominate",
    body: "Anyone in the club throws a movie into the ring for this cycle.",
  },
  {
    icon: ListChecks,
    title: "Vote",
    body: "Rank your favorites — instant-runoff voting finds the group's real pick.",
  },
  {
    icon: Sparkles,
    title: "Watch",
    body: "Set the pick as this cycle's watch and get everyone in front of a screen.",
  },
  {
    icon: Star,
    title: "Rate & review",
    body: "Score it, write it up, and see how your taste stacks up over time.",
  },
];

const FEATURES = [
  {
    icon: Film,
    title: "Real movie data",
    body: "Search and browse backed by TMDB and OMDb — posters, cast, ratings, all cached for instant lookups.",
  },
  {
    icon: Trophy,
    title: "Club leaderboard",
    body: "See who's rated the most, who's the toughest critic, and who always picks a winner.",
  },
  {
    icon: Users,
    title: "Friends & activity feed",
    body: "Follow friends across clubs and catch up on what everyone's been watching and rating.",
  },
];

export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Clapperboard className="size-6 text-primary" />
          Reel Club
        </div>
        {signedIn ? (
          <Button asChild size="sm">
            <Link href="/clubs">Go to your clubs</Link>
          </Button>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/clubs" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Sign in
            </Button>
          </form>
        )}
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="max-w-lg space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Letterboxd meets movie night
          </h1>
          <p className="text-lg text-muted-foreground">
            Form a club with friends, nominate movies, vote on what to watch
            next, and rate &amp; review together once the credits roll.
          </p>
        </div>
        {signedIn ? (
          <Button asChild size="lg">
            <Link href="/clubs">Go to your clubs</Link>
          </Button>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/clubs" });
            }}
          >
            <Button type="submit" size="lg">
              Sign in with Google
            </Button>
          </form>
        )}
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="border-border/60">
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <step.icon className="size-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="border-border/60 bg-card/60">
              <CardContent className="space-y-3 pt-6">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <feature.icon className="size-4" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        Built for people who argue about what to watch next.
      </footer>
    </div>
  );
}
