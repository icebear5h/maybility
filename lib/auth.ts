import NextAuth from "next-auth"
import google from "next-auth/providers/google"
import prisma from "./prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"

 


// Exporting the necessary functions from NextAuth
export const { auth, handlers, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        google({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        })
    ],
    debug: true,
})
