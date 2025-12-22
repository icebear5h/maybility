import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getServerSession } from "next-auth";
import { prisma } from "./prisma";
import { ensureUserDefaultFolders } from "./ensure-default-folders";

// Disable adapter for now - database tables may not exist
// Re-enable once migrations are run: PrismaAdapter(prisma)
const useAdapter = false && (process.env.NODE_ENV === "production" || process.env.DATABASE_URL);

export const authOptions: NextAuthOptions = {
  adapter: useAdapter ? PrismaAdapter(prisma) : undefined,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
    }),
  ],
  pages: { signIn: "/auth/signin" },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, persist DB user id onto the token
      if (user && !(token as any).id) (token as any).id = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      // Expose id on session.user so your API can read it
      if (session.user && (token as any).id) {
        (session.user as any).id = (token as any).id as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Disabled until database is set up
      if (useAdapter && user?.id) {
        await ensureUserDefaultFolders(user.id)
      }
    },
  },
};

export const auth = () => getServerSession(authOptions);