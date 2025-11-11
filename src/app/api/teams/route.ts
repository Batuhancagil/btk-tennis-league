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

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only captains, managers and superadmins can bulk delete
    if (session.user.role === UserRole.PLAYER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { teamIds } = await req.json()

    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      return NextResponse.json({ error: "Missing or invalid teamIds" }, { status: 400 })
    }

    const results = {
      successful: [] as string[],
      failed: [] as Array<{ teamId: string; reason: string }>,
    }

    for (const teamId of teamIds) {
      try {
        const team = await prisma.team.findUnique({
          where: { id: teamId },
        })

        if (!team) {
          results.failed.push({ teamId, reason: "Takım bulunamadı" })
          continue
        }

        // Check authorization - captain can only delete their own teams
        if (team.captainId !== session.user.id && session.user.role !== UserRole.SUPERADMIN && session.user.role !== UserRole.MANAGER) {
          results.failed.push({ teamId, reason: "Yetkiniz yok" })
          continue
        }

        // Check if team has matches
        const homeMatchesCount = await prisma.match.count({
          where: { homeTeamId: teamId },
        })

        const awayMatchesCount = await prisma.match.count({
          where: { awayTeamId: teamId },
        })

        if (homeMatchesCount > 0 || awayMatchesCount > 0) {
          results.failed.push({
            teamId,
            reason: "Bu takımın maçları bulunmaktadır. Maçları olan takımlar silinemez.",
          })
          continue
        }

        // Delete the team
        await prisma.team.delete({
          where: { id: teamId },
        })

        results.successful.push(teamId)
      } catch (error) {
        console.error(`Error deleting team ${teamId}:`, error)
        results.failed.push({ teamId, reason: "Silme işlemi sırasında hata oluştu" })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error bulk deleting teams:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

