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

    const { teamId, playerId } = await req.json()

    if (!teamId || !playerId) {
      return NextResponse.json({ error: "Missing teamId or playerId" }, { status: 400 })
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

    // Check if player exists and get their gender
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
        { error: "Erkek takımına sadece erkek oyuncular davet edilebilir" },
        { status: 400 }
      )
    }

    if (team.category === "FEMALE" && player.gender !== "FEMALE") {
      return NextResponse.json(
        { error: "Kadın takımına sadece kadın oyuncular davet edilebilir" },
        { status: 400 }
      )
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findUnique({
      where: {
        teamId_playerId: {
          teamId,
          playerId,
        },
      },
    })

    if (existingInvitation) {
      return NextResponse.json({ error: "Invitation already exists" }, { status: 400 })
    }

    const invitation = await prisma.invitation.create({
      data: {
        teamId,
        playerId,
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

    return NextResponse.json(invitation)
  } catch (error: any) {
    console.error("Error creating invitation:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Invitation already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

