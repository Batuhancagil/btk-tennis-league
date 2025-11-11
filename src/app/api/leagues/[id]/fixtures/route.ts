import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MatchType, MatchStatus, LeagueFormat } from "@prisma/client"
import { generateRoundRobinFixtures, generatePlayerFixtures } from "@/lib/fixture"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only managers and superadmins can generate fixtures
    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const league = await prisma.league.findUnique({
      where: { id: params.id },
      include: {
        teams: true,
        leaguePlayers: {
          include: {
            player: true,
          },
        },
      },
    })

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    // Check if user is manager of this league
    if (league.managerId !== session.user.id && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { matchType, startDate } = await req.json()

    if (!matchType || !Object.values(MatchType).includes(matchType)) {
      return NextResponse.json({ error: "Invalid match type" }, { status: 400 })
    }

    // Check if fixtures already exist
    const existingMatches = await prisma.match.findMany({
      where: { leagueId: params.id },
    })

    if (existingMatches.length > 0) {
      return NextResponse.json(
        { error: "Fixtures already exist for this league" },
        { status: 400 }
      )
    }

    // Generate fixtures based on league format
    let fixtures: any[]
    let matches: any[]

    if (league.format === LeagueFormat.INDIVIDUAL) {
      // Individual league: use players
      if (league.leaguePlayers.length < 2) {
        return NextResponse.json(
          { error: "Individual league must have at least 2 players" },
          { status: 400 }
        )
      }

      const playerIds = league.leaguePlayers.map((lp) => lp.playerId)
      fixtures = generatePlayerFixtures(playerIds)

      // Create matches for individual league
      const baseDate = startDate ? new Date(startDate) : new Date()
      matches = fixtures.map((fixture, index) => {
        const matchDate = new Date(baseDate)
        matchDate.setDate(baseDate.getDate() + index * 7) // One week apart

        return {
          leagueId: params.id,
          homePlayerId: fixture.homePlayerId,
          awayPlayerId: fixture.awayPlayerId,
          category: league.category,
          matchType: matchType as MatchType,
          scheduledDate: matchDate,
          status: MatchStatus.SCHEDULED,
        }
      })
    } else {
      // Doubles league: use teams
      if (league.teams.length < 2) {
        return NextResponse.json(
          { error: "Doubles league must have at least 2 teams" },
          { status: 400 }
        )
      }

      const teamIds = league.teams.map((t) => t.id)
      fixtures = generateRoundRobinFixtures(teamIds)

      // Create matches for doubles league
      const baseDate = startDate ? new Date(startDate) : new Date()
      matches = fixtures.map((fixture, index) => {
        const matchDate = new Date(baseDate)
        matchDate.setDate(baseDate.getDate() + index * 7) // One week apart

        return {
          leagueId: params.id,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          category: league.category,
          matchType: matchType as MatchType,
          scheduledDate: matchDate,
          status: MatchStatus.SCHEDULED,
        }
      })
    }

    const createdMatches = await prisma.match.createMany({
      data: matches,
    })

    // Fetch created matches with relations
    const matchesWithRelations = await prisma.match.findMany({
      where: { leagueId: params.id },
      include: {
        homeTeam: true,
        awayTeam: true,
        homePlayer: {
          select: {
            id: true,
            name: true,
          },
        },
        awayPlayer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
    })

    return NextResponse.json({
      success: true,
      count: createdMatches.count,
      matches: matchesWithRelations,
    })
  } catch (error) {
    console.error("Error generating fixtures:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

