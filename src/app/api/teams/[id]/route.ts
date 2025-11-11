import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, TeamCategory } from "@prisma/client"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const team = await prisma.team.findUnique({
      where: { id: params.id },
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
    })

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    return NextResponse.json(team)
  } catch (error) {
    console.error("Error fetching team:", error)
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

    const team = await prisma.team.findUnique({
      where: { id: params.id },
    })

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Only captain of the team, manager, or superadmin can edit
    if (team.captainId !== session.user.id && session.user.role !== UserRole.SUPERADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { name, category, maxPlayers } = await req.json()

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (category !== undefined) {
      if (!Object.values(TeamCategory).includes(category)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 })
      }
      updateData.category = category as TeamCategory
    }
    if (maxPlayers !== undefined) {
      if (maxPlayers === null) {
        updateData.maxPlayers = null
      } else {
        const parsed = parseInt(maxPlayers)
        if (isNaN(parsed) || parsed < 1) {
          return NextResponse.json({ error: "maxPlayers must be a positive number" }, { status: 400 })
        }
        // Check if reducing maxPlayers would remove current players
        const currentPlayerCount = await prisma.teamPlayer.count({
          where: { teamId: params.id },
        })
        if (parsed < currentPlayerCount) {
          return NextResponse.json(
            { error: `maxPlayers cannot be less than current player count (${currentPlayerCount})` },
            { status: 400 }
          )
        }
        updateData.maxPlayers = parsed
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id: params.id },
      data: updateData,
      include: {
        captain: {
          select: {
            id: true,
            name: true,
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
      },
    })

    return NextResponse.json(updatedTeam)
  } catch (error) {
    console.error("Error updating team:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

