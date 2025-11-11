import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, TeamCategory } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const category = searchParams.get("category")
    const leagueId = searchParams.get("leagueId")

    const where: any = {}
    if (category) where.category = category
    if (leagueId) where.leagueId = leagueId

    const teams = await prisma.team.findMany({
      where,
      include: {
        captain: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        players: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                gender: true,
                level: true,
              },
            },
          },
        },
        league: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(teams)
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only captains and above can create teams
    if (session.user.role === UserRole.PLAYER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { name, category, leagueId, maxPlayers } = await req.json()

    if (!name || !category) {
      return NextResponse.json({ error: "Missing name or category" }, { status: 400 })
    }

    if (!Object.values(TeamCategory).includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    // Validate maxPlayers if provided
    let maxPlayersValue: number | null = null
    if (maxPlayers !== undefined && maxPlayers !== null) {
      const parsed = parseInt(maxPlayers)
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json({ error: "maxPlayers must be a positive number" }, { status: 400 })
      }
      maxPlayersValue = parsed
    }

    const team = await prisma.team.create({
      data: {
        name,
        category: category as TeamCategory,
        captainId: session.user.id,
        leagueId: leagueId || null,
        maxPlayers: maxPlayersValue,
      },
      include: {
        captain: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(team)
  } catch (error) {
    console.error("Error creating team:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

