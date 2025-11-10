import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { prisma } from "./prisma"
import { UserRole, UserStatus } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email! },
          select: {
            id: true,
            role: true,
            status: true,
            gender: true,
            level: true,
          },
        })

        if (dbUser) {
          session.user.id = dbUser.id
          session.user.role = dbUser.role
          session.user.status = dbUser.status
          session.user.gender = dbUser.gender
          session.user.level = dbUser.level
        }
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (!user.email) return false

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      })

      if (!existingUser) {
        // Create new user with pending status
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name || "User",
            gender: "MALE", // Default, should be updated in profile
            role: UserRole.PLAYER,
            status: UserStatus.PENDING,
            image: user.image,
          },
        })
      }

      return true
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "database",
  },
}

