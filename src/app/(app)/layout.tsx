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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
