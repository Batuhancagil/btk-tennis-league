import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeagueType, LeagueStatus, TeamCategory, LeagueFormat } from "@prisma/client"

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
            leaguePlayers: true,
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

    const { name, type, category, season, format } = await req.json()

    if (!name || !type || !category || !season) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!Object.values(LeagueType).includes(type)) {
      return NextResponse.json({ error: "Invalid league type" }, { status: 400 })
    }

    if (!Object.values(TeamCategory).includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    // Validate format if provided, otherwise default to DOUBLES
    let leagueFormat: LeagueFormat = LeagueFormat.DOUBLES
    if (format) {
      if (format !== LeagueFormat.DOUBLES && format !== LeagueFormat.INDIVIDUAL) {
        return NextResponse.json({ error: "Invalid league format" }, { status: 400 })
      }
      leagueFormat = format as LeagueFormat
    }

    const league = await prisma.league.create({
      data: {
        name,
        type: type as LeagueType,
        format: leagueFormat,
        category: category as TeamCategory,
        season,
        managerId: session.user.id,
        status: LeagueStatus.DRAFT,
      } as any, // Type assertion needed until Prisma Client is regenerated with new schema
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

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only managers and superadmins can bulk delete leagues
    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { leagueIds } = await req.json()

    if (!leagueIds || !Array.isArray(leagueIds) || leagueIds.length === 0) {
      return NextResponse.json({ error: "Missing or invalid leagueIds" }, { status: 400 })
    }

    const results = {
      successful: [] as string[],
      failed: [] as Array<{ leagueId: string; reason: string }>,
    }

    for (const leagueId of leagueIds) {
      try {
        const league = await prisma.league.findUnique({
          where: { id: leagueId },
        })

        if (!league) {
          results.failed.push({ leagueId, reason: "Lig bulunamadı" })
          continue
        }

        // Check authorization
        if (league.managerId !== session.user.id && session.user.role !== UserRole.SUPERADMIN) {
          results.failed.push({ leagueId, reason: "Yetkiniz yok" })
          continue
        }

        // Check if league has matches
        const matchesCount = await prisma.match.count({
          where: { leagueId },
        })

        if (matchesCount > 0) {
          results.failed.push({
            leagueId,
            reason: "Bu ligin maçları bulunmaktadır. Maçları olan ligler silinemez.",
          })
          continue
        }

        // Delete the league
        await prisma.league.delete({
          where: { id: leagueId },
        })

        results.successful.push(leagueId)
      } catch (error) {
        console.error(`Error deleting league ${leagueId}:`, error)
        results.failed.push({ leagueId, reason: "Silme işlemi sırasında hata oluştu" })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error bulk deleting leagues:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only managers and superadmins can bulk update leagues
    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { leagueIds, status } = await req.json()

    if (!leagueIds || !Array.isArray(leagueIds) || leagueIds.length === 0) {
      return NextResponse.json({ error: "Missing or invalid leagueIds" }, { status: 400 })
    }

    if (!status || status !== LeagueStatus.COMPLETED) {
      return NextResponse.json({ error: "Invalid status. Only COMPLETED is allowed for bulk update" }, { status: 400 })
    }

    const results = {
      successful: [] as string[],
      failed: [] as Array<{ leagueId: string; reason: string }>,
    }

    for (const leagueId of leagueIds) {
      try {
        const league = await prisma.league.findUnique({
          where: { id: leagueId },
        })

        if (!league) {
          results.failed.push({ leagueId, reason: "Lig bulunamadı" })
          continue
        }

        // Check authorization
        if (league.managerId !== session.user.id && session.user.role !== UserRole.SUPERADMIN) {
          results.failed.push({ leagueId, reason: "Yetkiniz yok" })
          continue
        }

        // Update league status
        await prisma.league.update({
          where: { id: leagueId },
          data: { status: LeagueStatus.COMPLETED },
        })

        results.successful.push(leagueId)
      } catch (error) {
        console.error(`Error updating league ${leagueId}:`, error)
        results.failed.push({ leagueId, reason: "Güncelleme işlemi sırasında hata oluştu" })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error bulk updating leagues:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

