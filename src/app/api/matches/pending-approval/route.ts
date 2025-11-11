import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, ScoreStatus } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only managers can view pending approvals
    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get matches with pending scores for manager's leagues
    const matches = await prisma.match.findMany({
      where: {
        scoreStatus: {
          in: [
            ScoreStatus.REPORTED_BY_HOME,
            ScoreStatus.REPORTED_BY_AWAY,
            ScoreStatus.REPORTED_BY_BOTH,
          ],
        },
        league: {
          managerId: session.user.role === UserRole.SUPERADMIN ? undefined : session.user.id,
        },
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            format: true,
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
        scoreReports: {
          include: {
            reporter: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(matches)
  } catch (error) {
    console.error("Error fetching pending approvals:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

