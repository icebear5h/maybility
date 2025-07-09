import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import prisma from "./prisma" // Assuming lib/prisma.ts is in your new project
import { PrismaAdapter } from "@auth/prisma-adapter"

export const { GET, POST, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "https://www.googleapis.com/auth/calendar.readonly",
        },
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, id: token.sub! },
    }),
    jwt: ({ user, token }) => {
      if (user) token.uid = user.id;
      return token;
    },
  },
});