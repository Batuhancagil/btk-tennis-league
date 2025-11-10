import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    return NextResponse.json(session || null)
  } catch (error: any) {
    console.error("[Session API] Error:", error)
    return NextResponse.json(
      { error: "Failed to get session", message: error.message },
      { status: 500 }
    )
  }
}

