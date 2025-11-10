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

