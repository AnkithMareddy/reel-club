import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "@/components/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, username: true, bio: true, image: true },
  });

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Reel Club</CardTitle>
          <CardDescription>
            Set up your profile before you join or start a club.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            defaultName={user.name ?? ""}
            defaultUsername={user.username ?? ""}
            defaultBio={user.bio ?? ""}
            image={user.image}
          />
        </CardContent>
      </Card>
    </div>
  );
}
