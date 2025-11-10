import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MatchType } from "@prisma/client"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { teamId, playerIds } = await req.json()

    if (!teamId || !playerIds || !Array.isArray(playerIds)) {
      return NextResponse.json({ error: "Missing teamId or playerIds" }, { status: 400 })
    }

    // Check if user is captain of the team
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        captainId: session.user.id,
      },
    })

    if (!team) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get match to check match type
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

    // Validate player count based on match type
    if (match.matchType === MatchType.SINGLE && playerIds.length > 2) {
      return NextResponse.json(
        { error: "Single maç için maksimum 2 oyuncu seçilebilir" },
        { status: 400 }
      )
    }

    if (match.matchType === MatchType.DOUBLE && playerIds.length < 2) {
      return NextResponse.json(
        { error: "Double maç için minimum 2 oyuncu seçilmelidir" },
        { status: 400 }
      )
    }

    if (match.matchType === MatchType.DOUBLE && playerIds.length > 4) {
      return NextResponse.json(
        { error: "Double maç için maksimum 4 oyuncu seçilebilir" },
        { status: 400 }
      )
    }

    // Check if players are in the team
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: {
        teamId,
        playerId: { in: playerIds },
      },
    })

    if (teamPlayers.length !== playerIds.length) {
      return NextResponse.json(
        { error: "Seçilen oyuncuların bazıları takımda değil" },
        { status: 400 }
      )
    }

    // Delete existing squad for this team
    await prisma.matchSquad.deleteMany({
      where: {
        matchId: params.id,
        teamId,
      },
    })

    // Create new squad entries
    const squadEntries = playerIds.map((playerId: string, index: number) => ({
      matchId: params.id,
      teamId,
      playerId,
      position: index + 1,
    }))

    await prisma.matchSquad.createMany({
      data: squadEntries,
    })

    const squads = await prisma.matchSquad.findMany({
      where: {
        matchId: params.id,
        teamId,
      },
      include: {
        player: true,
      },
    })

    return NextResponse.json(squads)
  } catch (error) {
    console.error("Error setting match squad:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const teamId = searchParams.get("teamId")

    const where: any = { matchId: params.id }
    if (teamId) where.teamId = teamId

    const squads = await prisma.matchSquad.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            name: true,
            gender: true,
            level: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { position: "asc" },
    })

    return NextResponse.json(squads)
  } catch (error) {
    console.error("Error fetching match squad:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

