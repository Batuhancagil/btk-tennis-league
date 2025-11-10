import { NextResponse } from "next/server"

export async function GET() {
  // Don't expose secrets in production, just check if they exist
  const config = {
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    nodeEnv: process.env.NODE_ENV,
  }

  return NextResponse.json(config)
}

