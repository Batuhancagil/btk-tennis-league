import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

let handler: ReturnType<typeof NextAuth>

try {
  handler = NextAuth(authOptions)
} catch (error) {
  console.error("NextAuth initialization error:", error)
  // Return error handler for failed initialization
  handler = NextAuth({
    providers: [],
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
      error: "/auth/error",
    },
  }) as any
}

export async function GET(req: Request) {
  try {
    return await handler(req)
  } catch (error) {
    console.error("NextAuth GET error:", error)
    return NextResponse.json(
      { error: "Authentication configuration error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    return await handler(req)
  } catch (error) {
    console.error("NextAuth POST error:", error)
    return NextResponse.json(
      { error: "Authentication configuration error" },
      { status: 500 }
    )
  }
}

