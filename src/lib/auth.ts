import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { prisma } from "./prisma"
import { UserRole, UserStatus } from "@prisma/client"

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.error(
    "ERROR: NEXTAUTH_SECRET is not set. Please set it in your environment variables. " +
    "You can generate one using: openssl rand -base64 32"
  )
  // Don't throw here to allow the app to start, but NextAuth will fail at runtime
  // This helps with debugging in production
}

// Build providers array conditionally
const providers = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  )
}

if (providers.length === 0) {
  console.warn("Warning: No OAuth providers configured. Please set GOOGLE_CLIENT_ID/SECRET or GITHUB_ID/SECRET")
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: providers as any,
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
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

