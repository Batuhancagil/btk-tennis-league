import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MatchStatus } from "@prisma/client"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        league: true,
        homeTeam: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
        awayTeam: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
        squads: {
          include: {
            player: true,
            team: true,
          },
        },
      },
    })

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    return NextResponse.json(match)
  } catch (error) {
    console.error("Error fetching match:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()

    // Check if user is captain of one of the teams or manager
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    })

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    const isCaptain =
      match.homeTeam.captainId === session.user.id ||
      match.awayTeam.captainId === session.user.id
    const isManager = session.user.role === UserRole.MANAGER || session.user.role === UserRole.SUPERADMIN

    if (!isCaptain && !isManager) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Captains can only update scores, managers can update everything
    const updateData: any = {}
    if (isManager || isCaptain) {
      if (data.homeScore !== undefined) updateData.homeScore = data.homeScore
      if (data.awayScore !== undefined) updateData.awayScore = data.awayScore
      if (data.scheduledDate !== undefined) updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null
    }
    if (isManager) {
      if (data.status) updateData.status = data.status as MatchStatus
      if (data.status === MatchStatus.PLAYED && !match.approvedById) {
        updateData.approvedById = session.user.id
        updateData.approvedAt = new Date()
      }
    }

    const updatedMatch = await prisma.match.update({
      where: { id: params.id },
      data: updateData,
      include: {
        league: true,
        homeTeam: true,
        awayTeam: true,
      },
    })

    return NextResponse.json(updatedMatch)
  } catch (error) {
    console.error("Error updating match:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

