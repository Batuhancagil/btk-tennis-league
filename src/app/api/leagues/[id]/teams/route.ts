import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeagueFormat } from "@prisma/client"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only managers and superadmins can add teams to leagues
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

    const { teamId } = await req.json()

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId" }, { status: 400 })
    }

    // Check if team exists and matches league category
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    if (team.category !== league.category) {
      return NextResponse.json(
        { error: "Team category does not match league category" },
        { status: 400 }
      )
    }

    // Only doubles leagues can have teams
    if (league.format !== LeagueFormat.DOUBLES) {
      return NextResponse.json(
        { error: "Teams can only be added to doubles leagues" },
        { status: 400 }
      )
    }

    // Add team to league
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { leagueId: params.id },
      include: {
        captain: true,
      },
    })

    return NextResponse.json(updatedTeam)
  } catch (error) {
    console.error("Error adding team to league:", error)
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

    // Only managers and superadmins can remove teams from leagues
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

    const searchParams = req.nextUrl.searchParams
    const teamId = searchParams.get("teamId")

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId" }, { status: 400 })
    }

    // Remove team from league
    await prisma.team.update({
      where: { id: teamId },
      data: { leagueId: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing team from league:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

