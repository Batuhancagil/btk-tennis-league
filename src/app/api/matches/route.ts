import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MatchStatus, MatchType, TeamCategory } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const leagueId = searchParams.get("leagueId")
    const teamId = searchParams.get("teamId")
    const status = searchParams.get("status")

    const where: any = {}
    if (leagueId) where.leagueId = leagueId
    if (teamId) {
      where.OR = [{ homeTeamId: teamId }, { awayTeamId: teamId }]
    }
    if (status) where.status = status

    const matches = await prisma.match.findMany({
      where,
      include: {
        league: {
          select: {
            id: true,
            name: true,
          },
        },
        homeTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        squads: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: "desc" },
    })

    return NextResponse.json(matches)
  } catch (error) {
    console.error("Error fetching matches:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only managers and superadmins can create matches
    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { leagueId, homeTeamId, awayTeamId, category, matchType, scheduledDate } = await req.json()

    if (!leagueId || !homeTeamId || !awayTeamId || !category || !matchType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!Object.values(MatchType).includes(matchType)) {
      return NextResponse.json({ error: "Invalid match type" }, { status: 400 })
    }

    const match = await prisma.match.create({
      data: {
        leagueId,
        homeTeamId,
        awayTeamId,
        category: category as TeamCategory,
        matchType: matchType as MatchType,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        status: MatchStatus.SCHEDULED,
      },
      include: {
        league: true,
        homeTeam: true,
        awayTeam: true,
      },
    })

    return NextResponse.json(match)
  } catch (error) {
    console.error("Error creating match:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

