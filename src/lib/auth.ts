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
  console.error("ERROR: No OAuth providers configured. Please set GOOGLE_CLIENT_ID/SECRET or GITHUB_ID/SECRET")
  // NextAuth requires at least one provider, so we'll add a dummy one to prevent crashes
  // but it won't work - this is just to allow the app to start
  console.error("WARNING: NextAuth will not work without providers!")
}

// Log provider count for debugging
console.log(`[NextAuth] Initializing with ${providers.length} provider(s)`)

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: providers.length > 0 ? (providers as any) : [],
  secret: process.env.NEXTAUTH_SECRET || "temp-secret-change-in-production",
  debug: true, // Enable debug in production to see errors
  callbacks: {
    async session({ session, user }) {
      try {
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
      } catch (error) {
        console.error("[NextAuth] Session callback error:", error)
      }
      return session
    },
    async signIn({ user, account, profile }) {
      try {
        if (!user.email) {
          console.error("[NextAuth] SignIn: No email provided")
          return false
        }

        console.log(`[NextAuth] SignIn attempt for email: ${user.email}, provider: ${account?.provider}`)

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        })

        if (existingUser) {
          console.log(`[NextAuth] User exists: ${existingUser.id}, accounts: ${existingUser.accounts.length}`)
          
          // Check if account already linked
          const existingAccount = existingUser.accounts.find(
            (acc) => acc.provider === account?.provider && acc.providerAccountId === account?.providerAccountId
          )

          if (existingAccount) {
            console.log(`[NextAuth] Account already linked: ${existingAccount.id}`)
            return true
          }

          // If user exists but account doesn't, PrismaAdapter should link it
          // But if it fails, we need to handle it
          console.log(`[NextAuth] User exists but account not linked, adapter will handle`)
        } else {
          console.log(`[NextAuth] New user, adapter will create`)
        }

        // PrismaAdapter will automatically create User and Account or link Account
        return true
      } catch (error) {
        console.error("[NextAuth] SignIn callback error:", error)
        return false
      }
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

