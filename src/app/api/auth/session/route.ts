import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    // Return null if no session instead of undefined
    if (!session) {
      return NextResponse.json(null)
    }
    return NextResponse.json(session)
  } catch (error: any) {
    console.error("[Session API] Error:", error)
    // Return null on error instead of error object to prevent client-side issues
    return NextResponse.json(null)
  }
}

