import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeagueStatus } from "@prisma/client"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const league = await prisma.league.findUnique({
      where: { id: params.id },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
          },
        },
        teams: {
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
                  },
                },
              },
            },
          },
        },
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
          orderBy: { scheduledDate: "asc" },
        },
        leaguePlayers: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                email: true,
                gender: true,
                level: true,
              },
            },
          },
          orderBy: { joinedAt: "desc" },
        },
      },
    })

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    return NextResponse.json(league)
  } catch (error) {
    console.error("Error fetching league:", error)
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

    // Only managers and superadmins can update leagues
    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const league = await prisma.league.findUnique({
      where: { id: params.id },
    })

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    // Check if user is manager of this league
    if (league.managerId !== session.user.id && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const data = await req.json()

    // Handle startLeague action
    if (data.action === "startLeague") {
      if (league.status !== LeagueStatus.DRAFT) {
        return NextResponse.json(
          { error: "Only DRAFT leagues can be started" },
          { status: 400 }
        )
      }

      const updatedLeague = await prisma.league.update({
        where: { id: params.id },
        data: {
          status: LeagueStatus.ACTIVE,
        },
        include: {
          manager: true,
        },
      })

      return NextResponse.json(updatedLeague)
    }

    const updatedLeague = await prisma.league.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.status && { status: data.status as LeagueStatus }),
      },
      include: {
        manager: true,
      },
    })

    return NextResponse.json(updatedLeague)
  } catch (error) {
    console.error("Error updating league:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only managers and superadmins can delete leagues
    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const league = await prisma.league.findUnique({
      where: { id: params.id },
    })

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    // Check if user is manager of this league
    if (league.managerId !== session.user.id && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if league has matches
    const matchesCount = await prisma.match.count({
      where: { leagueId: params.id },
    })

    const data = await req.json()
    const confirmation = data.confirmation

    if (matchesCount > 0) {
      // Require confirmation to delete league with matches
      if (confirmation !== "DELETE") {
        return NextResponse.json(
          { 
            error: "Bu ligin maçları bulunmaktadır. Silmek için 'DELETE' yazmanız gerekmektedir.",
            requiresConfirmation: true,
            matchesCount,
          },
          { status: 400 }
        )
      }
    }

    // Delete the league (cascade will handle teams, leaguePlayers, etc.)
    await prisma.league.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting league:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

