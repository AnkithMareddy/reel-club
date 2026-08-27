import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NavHeader } from "@/components/nav-header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, image: true },
  });
  if (!user) redirect("/");
  if (!user.username) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader user={user} />
      {/* Extra bottom padding clears the mobile tab bar. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:pb-10">{children}</main>
    </div>
  );
}
