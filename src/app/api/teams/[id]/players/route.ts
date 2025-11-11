import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function POST(
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

    // Only captain of the team, manager, or superadmin can add players
    if (team.captainId !== session.user.id && session.user.role !== UserRole.SUPERADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { playerId } = await req.json()

    if (!playerId) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 })
    }

    // Check if player exists
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { gender: true },
    })

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    // Validate gender compatibility
    if (team.category === "MALE" && player.gender !== "MALE") {
      return NextResponse.json(
        { error: "Erkek takımına sadece erkek oyuncular eklenebilir" },
        { status: 400 }
      )
    }

    if (team.category === "FEMALE" && player.gender !== "FEMALE") {
      return NextResponse.json(
        { error: "Kadın takımına sadece kadın oyuncular eklenebilir" },
        { status: 400 }
      )
    }

    // Check if player is already in team
    const existingMember = await prisma.teamPlayer.findUnique({
      where: {
        teamId_playerId: {
          teamId: params.id,
          playerId: playerId,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json({ error: "Player already in team" }, { status: 400 })
    }

    // Check maxPlayers limit
    if (team.maxPlayers !== null) {
      const currentPlayerCount = await prisma.teamPlayer.count({
        where: { teamId: params.id },
      })
      
      if (currentPlayerCount >= team.maxPlayers) {
        return NextResponse.json(
          { error: `Takım maksimum oyuncu sayısına ulaştı (${team.maxPlayers})` },
          { status: 400 }
        )
      }
    }

    const teamPlayer = await prisma.teamPlayer.create({
      data: {
        teamId: params.id,
        playerId: playerId,
      },
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
    })

    // Check if team is now full and withdraw pending invitations
    if (team.maxPlayers !== null) {
      const newPlayerCount = await prisma.teamPlayer.count({
        where: { teamId: params.id },
      })
      
      if (newPlayerCount >= team.maxPlayers) {
        // Withdraw all pending invitations for this team
        await prisma.invitation.updateMany({
          where: {
            teamId: params.id,
            status: "PENDING",
          },
          data: {
            status: "REJECTED",
          },
        })
      }
    }

    return NextResponse.json(teamPlayer)
  } catch (error: any) {
    console.error("Error adding player to team:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Player already in team" }, { status: 400 })
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

    const team = await prisma.team.findUnique({
      where: { id: params.id },
    })

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Only captain of the team, manager, or superadmin can remove players
    if (team.captainId !== session.user.id && session.user.role !== UserRole.SUPERADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const playerId = searchParams.get("playerId")

    if (!playerId) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 })
    }

    // Don't allow removing the captain
    if (team.captainId === playerId) {
      return NextResponse.json({ error: "Cannot remove team captain" }, { status: 400 })
    }

    await prisma.teamPlayer.delete({
      where: {
        teamId_playerId: {
          teamId: params.id,
          playerId: playerId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error removing player from team:", error)
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Player not in team" }, { status: 404 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

