import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MatchStatus } from "@prisma/client"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only managers and superadmins can approve matches
    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        league: true,
      },
    })

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    // Check if user is manager of this league
    if (
      match.league.managerId !== session.user.id &&
      session.user.role !== UserRole.SUPERADMIN
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (match.homeScore === null || match.awayScore === null) {
      return NextResponse.json(
        { error: "Match scores must be set before approval" },
        { status: 400 }
      )
    }

    const updatedMatch = await prisma.match.update({
      where: { id: params.id },
      data: {
        status: MatchStatus.PLAYED,
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
      include: {
        league: true,
        homeTeam: true,
        awayTeam: true,
      },
    })

    return NextResponse.json(updatedMatch)
  } catch (error) {
    console.error("Error approving match:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

