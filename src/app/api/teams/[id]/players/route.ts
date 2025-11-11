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

    const { playerId, playerIds } = await req.json()

    // Support both single playerId and array of playerIds
    const playerIdsToAdd = playerIds && Array.isArray(playerIds) ? playerIds : playerId ? [playerId] : []
    
    if (playerIdsToAdd.length === 0) {
      return NextResponse.json({ error: "Missing playerId or playerIds" }, { status: 400 })
    }

    const created = []
    const errors = []

    for (const pid of playerIdsToAdd) {
      try {
        // Check if player exists
        const player = await prisma.user.findUnique({
          where: { id: pid },
          select: { gender: true },
        })

        if (!player) {
          errors.push(`Oyuncu bulunamadı: ${pid}`)
          continue
        }

        // Validate gender compatibility
        if (team.category === "MALE" && player.gender !== "MALE") {
          errors.push(`Erkek takımına sadece erkek oyuncular eklenebilir: ${pid}`)
          continue
        }

        if (team.category === "FEMALE" && player.gender !== "FEMALE") {
          errors.push(`Kadın takımına sadece kadın oyuncular eklenebilir: ${pid}`)
          continue
        }

        // Check if player is already in team
        const existingMember = await prisma.teamPlayer.findUnique({
          where: {
            teamId_playerId: {
              teamId: params.id,
              playerId: pid,
            },
          },
        })

        if (existingMember) {
          errors.push(`Oyuncu zaten takımda: ${pid}`)
          continue
        }

        // Check maxPlayers limit
        if (team.maxPlayers !== null) {
          const currentPlayerCount = await prisma.teamPlayer.count({
            where: { teamId: params.id },
          })
          
          if (currentPlayerCount >= team.maxPlayers) {
            errors.push(`Takım maksimum oyuncu sayısına ulaştı (${team.maxPlayers}): ${pid}`)
            continue
          }
        }

        const teamPlayer = await prisma.teamPlayer.create({
          data: {
            teamId: params.id,
            playerId: pid,
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

        created.push(teamPlayer)

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
      } catch (error: any) {
        if (error.code === "P2002") {
          errors.push(`Oyuncu zaten takımda: ${pid}`)
        } else {
          errors.push(`Hata: ${pid} - ${error.message || "Bilinmeyen hata"}`)
        }
      }
    }

    // If single player, return single object for backward compatibility
    if (playerIdsToAdd.length === 1 && created.length === 1) {
      return NextResponse.json(created[0])
    }

    // For batch, return summary
    return NextResponse.json({
      created: created.length,
      errors: errors.length > 0 ? errors : undefined,
      players: created,
    })
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

