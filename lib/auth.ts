import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getServerSession } from "next-auth";
import { prisma } from "./prisma";
import { ensureUserDefaultFolders } from "./ensure-default-folders";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
      if (user?.id) {
        await ensureUserDefaultFolders(user.id)
      }
    },
  },
};

export const auth = () => getServerSession(authOptions);