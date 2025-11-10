import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeagueType, TeamCategory, LeagueStatus } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only superadmins can create leagues via this endpoint
    if (session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get current year for season
    const currentYear = new Date().getFullYear()
    const season = `${currentYear}-${currentYear + 1}`

    // Define leagues to create
    const leaguesToCreate = [
      // Men's leagues
      { name: "Erkek Birinci Lig", category: TeamCategory.MALE, type: LeagueType.CLUB },
      { name: "Erkek İkinci Lig", category: TeamCategory.MALE, type: LeagueType.CLUB },
      { name: "Erkek Üçüncü Lig", category: TeamCategory.MALE, type: LeagueType.CLUB },
      // Women's leagues
      { name: "Kadın Birinci Lig", category: TeamCategory.FEMALE, type: LeagueType.CLUB },
      { name: "Kadın İkinci Lig", category: TeamCategory.FEMALE, type: LeagueType.CLUB },
    ]

    const createdLeagues = []
    const skippedLeagues = []

    for (const leagueData of leaguesToCreate) {
      // Check if league already exists
      const existingLeague = await prisma.league.findFirst({
        where: {
          name: leagueData.name,
          season: season,
        },
      })

      if (existingLeague) {
        skippedLeagues.push(leagueData.name)
        continue
      }

      const league = await prisma.league.create({
        data: {
          name: leagueData.name,
          type: leagueData.type,
          category: leagueData.category,
          season: season,
          managerId: session.user.id,
          status: LeagueStatus.DRAFT,
        },
      })

      createdLeagues.push(league)
    }

    return NextResponse.json({
      message: "Leagues created successfully",
      created: createdLeagues.length,
      skipped: skippedLeagues.length,
      season: season,
      leagues: createdLeagues,
      skippedNames: skippedLeagues,
    })
  } catch (error: any) {
    console.error("Error creating leagues:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}

