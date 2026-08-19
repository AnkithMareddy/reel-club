import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Clapperboard } from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/clubs");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <div className="flex items-center gap-2 text-2xl font-semibold">
        <Clapperboard className="size-7" />
        Reel Club
      </div>
      <div className="max-w-md space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Letterboxd meets movie night
        </h1>
        <p className="text-muted-foreground">
          Form a club with friends, nominate movies, vote on what to watch
          next, and rate &amp; review together once the credits roll.
        </p>
      </div>
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
    </div>
  );
}
