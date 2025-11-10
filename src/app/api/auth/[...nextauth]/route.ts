import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Validate configuration before creating handler
if (!process.env.NEXTAUTH_SECRET) {
  console.error("CRITICAL: NEXTAUTH_SECRET is not set!")
}

// Check if providers are configured
const hasProviders = (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
                     (process.env.GITHUB_ID && process.env.GITHUB_SECRET)

if (!hasProviders) {
  console.error("CRITICAL: No OAuth providers configured!")
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

