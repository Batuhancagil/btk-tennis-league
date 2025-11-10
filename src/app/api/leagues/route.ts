import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeagueType, LeagueStatus, TeamCategory } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get("status")
    const publicView = searchParams.get("public") === "true"

    const where: any = {}
    if (status) where.status = status

    // If public view is requested, show all active leagues to all approved users
    if (publicView) {
      where.status = LeagueStatus.ACTIVE
    } else {
      // Managers see only their leagues, superadmins see all
      if (session.user.role !== UserRole.SUPERADMIN) {
        where.managerId = session.user.id
      }
    }

    const leagues = await prisma.league.findMany({
      where,
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
          },
        },
        _count: {
          select: {
            matches: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(leagues)
  } catch (error) {
    console.error("Error fetching leagues:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only managers and superadmins can create leagues
    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { name, type, category, season } = await req.json()

    if (!name || !type || !category || !season) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!Object.values(LeagueType).includes(type)) {
      return NextResponse.json({ error: "Invalid league type" }, { status: 400 })
    }

    if (!Object.values(TeamCategory).includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    const league = await prisma.league.create({
      data: {
        name,
        type: type as LeagueType,
        category: category as TeamCategory,
        season,
        managerId: session.user.id,
        status: LeagueStatus.DRAFT,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(league)
  } catch (error) {
    console.error("Error creating league:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

