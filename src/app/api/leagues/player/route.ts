import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get leagues where user is a player
    const leaguePlayers = await prisma.leaguePlayer.findMany({
      where: {
        playerId: session.user.id,
      },
      include: {
        league: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                leaguePlayers: true,
              },
            },
          },
        },
      },
    })

    const leagues = leaguePlayers.map((lp) => lp.league)

    return NextResponse.json(leagues)
  } catch (error) {
    console.error("Error fetching player leagues:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

