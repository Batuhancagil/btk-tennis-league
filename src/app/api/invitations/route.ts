import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // SUPERADMIN can see all invitations
    if (session.user.role === UserRole.SUPERADMIN) {
      const invitations = await prisma.invitation.findMany({
        include: {
          player: {
            select: {
              id: true,
              name: true,
              gender: true,
              level: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json(invitations)
    }

    // Players see their own invitations
    if (session.user.role === UserRole.PLAYER) {
      const invitations = await prisma.invitation.findMany({
        where: { playerId: session.user.id },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json(invitations)
    }

    // Captains see invitations for their teams
    if (session.user.role === UserRole.CAPTAIN) {
      const teams = await prisma.team.findMany({
        where: { captainId: session.user.id },
        select: { id: true },
      })

      const invitations = await prisma.invitation.findMany({
        where: {
          teamId: { in: teams.map((t) => t.id) },
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
          team: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json(invitations)
    }

    return NextResponse.json([])
  } catch (error) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { teamId, playerId, playerIds } = await req.json()

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId" }, { status: 400 })
    }

    // Support both single playerId and array of playerIds
    const playerIdsToInvite = playerIds && Array.isArray(playerIds) ? playerIds : playerId ? [playerId] : []
    
    if (playerIdsToInvite.length === 0) {
      return NextResponse.json({ error: "Missing playerId or playerIds" }, { status: 400 })
    }

    // Check if user is captain of the team
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        captainId: session.user.id,
      },
    })

    if (!team) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const created = []
    const errors = []

    for (const pid of playerIdsToInvite) {
      try {
        // Check if player exists and get their gender
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
          errors.push(`Erkek takımına sadece erkek oyuncular davet edilebilir: ${pid}`)
          continue
        }

        if (team.category === "FEMALE" && player.gender !== "FEMALE") {
          errors.push(`Kadın takımına sadece kadın oyuncular davet edilebilir: ${pid}`)
          continue
        }

        // Check if invitation already exists
        const existingInvitation = await prisma.invitation.findUnique({
          where: {
            teamId_playerId: {
              teamId,
              playerId: pid,
            },
          },
        })

        if (existingInvitation) {
          errors.push(`Davet zaten mevcut: ${pid}`)
          continue
        }

        const invitation = await prisma.invitation.create({
          data: {
            teamId,
            playerId: pid,
            invitedBy: session.user.id,
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
            team: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        })

        created.push(invitation)
      } catch (error: any) {
        if (error.code === "P2002") {
          errors.push(`Davet zaten mevcut: ${pid}`)
        } else {
          errors.push(`Hata: ${pid} - ${error.message || "Bilinmeyen hata"}`)
        }
      }
    }

    // If single invitation, return single object for backward compatibility
    if (playerIdsToInvite.length === 1 && created.length === 1) {
      return NextResponse.json(created[0])
    }

    // For batch, return summary
    return NextResponse.json({
      created: created.length,
      errors: errors.length > 0 ? errors : undefined,
      invitations: created,
    })
  } catch (error: any) {
    console.error("Error creating invitation:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Invitation already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

