import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeagueFormat } from "@prisma/client"

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
    })

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    // Only managers and superadmins can view league players
    if (league.managerId !== session.user.id && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const leaguePlayers = await prisma.leaguePlayer.findMany({
      where: { leagueId: params.id },
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
    })

    return NextResponse.json(leaguePlayers)
  } catch (error) {
    console.error("Error fetching league players:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
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
    })

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    // Only managers and superadmins can add players to leagues
    if (league.managerId !== session.user.id && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Only individual leagues can have players added directly
    if (league.format !== LeagueFormat.INDIVIDUAL) {
      return NextResponse.json(
        { error: "Players can only be added to individual leagues" },
        { status: 400 }
      )
    }

    const { playerId } = await req.json()

    if (!playerId) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 })
    }

    // Check if player exists
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { gender: true, status: true },
    })

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    // Only approved players can be added
    if (player.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only approved players can be added to leagues" },
        { status: 400 }
      )
    }

    // Validate gender compatibility
    if (league.category === "MALE" && player.gender !== "MALE") {
      return NextResponse.json(
        { error: "Erkek ligine sadece erkek oyuncular eklenebilir" },
        { status: 400 }
      )
    }

    if (league.category === "FEMALE" && player.gender !== "FEMALE") {
      return NextResponse.json(
        { error: "Kadın ligine sadece kadın oyuncular eklenebilir" },
        { status: 400 }
      )
    }

    // Check if player is already in league
    const existingMember = await prisma.leaguePlayer.findUnique({
      where: {
        leagueId_playerId: {
          leagueId: params.id,
          playerId: playerId,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json({ error: "Player already in league" }, { status: 400 })
    }

    const leaguePlayer = await prisma.leaguePlayer.create({
      data: {
        leagueId: params.id,
        playerId: playerId,
      },
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
    })

    return NextResponse.json(leaguePlayer)
  } catch (error: any) {
    console.error("Error adding player to league:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Player already in league" }, { status: 400 })
    }
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

    const league = await prisma.league.findUnique({
      where: { id: params.id },
    })

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    // Only managers and superadmins can remove players from leagues
    if (league.managerId !== session.user.id && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const playerId = searchParams.get("playerId")

    if (!playerId) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 })
    }

    await prisma.leaguePlayer.delete({
      where: {
        leagueId_playerId: {
          leagueId: params.id,
          playerId: playerId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error removing player from league:", error)
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Player not in league" }, { status: 404 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

