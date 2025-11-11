import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MatchRequestStatus } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const count = await prisma.matchRequest.count({
      where: {
        opponentId: session.user.id,
        status: MatchRequestStatus.PENDING,
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Error fetching pending match requests count:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

