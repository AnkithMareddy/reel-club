import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

async function uniqueUsernameFrom(seed: string) {
  const base = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20) || "user";

  let candidate = base;
  let suffix = 0;
  // Small, bounded loop — collisions are rare and the table is tiny at
  // friend-group scale, so a few round trips is fine.
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "database" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    newUser: "/onboarding",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true },
        });
        session.user.username = dbUser?.username ?? null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const username = await uniqueUsernameFrom(user.email ?? user.name ?? "user");
      await prisma.user.update({ where: { id: user.id }, data: { username } });
    },
  },
});
