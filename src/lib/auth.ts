import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { UserRole, UserStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

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
const providers: any[] = []

// Add Credentials provider for email/password authentication
providers.push(
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null
      }

      try {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        }) as any

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
          gender: user.gender,
          level: user.level,
        }
      } catch (error) {
        console.error("[NextAuth] Credentials authorize error:", error)
        return null
      }
    },
  })
)

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

// Log provider count for debugging
console.log(`[NextAuth] Initializing with ${providers.length} provider(s)`)

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: providers,
  secret: process.env.NEXTAUTH_SECRET || "temp-secret-change-in-production",
  debug: true, // Enable debug in production to see errors
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in - user object is available
      if (user) {
        token.id = user.id
        // If user has role/status from authorize (credentials provider), use them
        if ('role' in user && user.role) {
          token.role = user.role as UserRole
          token.status = user.status as UserStatus
          token.gender = user.gender as any
          token.level = user.level as any
        } else if (user.email) {
          // Otherwise fetch from database (OAuth providers)
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: {
              id: true,
              role: true,
              status: true,
              gender: true,
              level: true,
            },
          })

          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.status = dbUser.status
            token.gender = dbUser.gender
            token.level = dbUser.level
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          // JWT strategy - token always available
          if (token && typeof token === 'object') {
            if (token.id) session.user.id = token.id as string
            if (token.role) session.user.role = token.role as UserRole
            if (token.status) session.user.status = token.status as UserStatus
            if (token.gender) session.user.gender = token.gender as any
            if (token.level) session.user.level = token.level as any
          }
          
          // Fallback: fetch from database if token doesn't have required fields
          if (!session.user.id && session.user.email) {
            const dbUser = await prisma.user.findUnique({
              where: { email: session.user.email },
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
        }
      } catch (error) {
        console.error("[NextAuth] Session callback error:", error)
      }
      return session
    },
    async signIn({ user, account, profile }) {
      try {
        // Skip adapter for credentials provider (handled manually)
        if (account?.provider === "credentials") {
          return true
        }

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
    strategy: "jwt", // Use JWT for credentials provider compatibility
  },
}

