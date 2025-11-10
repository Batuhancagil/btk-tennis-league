import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { InvitationStatus, UserRole } from "@prisma/client"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { accept } = await req.json()

    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      include: {
        team: true,
      },
    })

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    // SUPERADMIN can accept invitations on behalf of players, otherwise only the invited player can respond
    const isSuperadmin = session.user.role === UserRole.SUPERADMIN
    if (!isSuperadmin && invitation.playerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return NextResponse.json({ error: "Invitation already processed" }, { status: 400 })
    }

    const status = accept ? InvitationStatus.ACCEPTED : InvitationStatus.REJECTED

    // Update invitation status
    await prisma.invitation.update({
      where: { id: params.id },
      data: { status },
    })

    // If accepted, add player to team
    if (accept) {
      // Check if player is already in team before adding
      const existingTeamPlayer = await prisma.teamPlayer.findUnique({
        where: {
          teamId_playerId: {
            teamId: invitation.teamId,
            playerId: invitation.playerId,
          },
        },
      })

      if (!existingTeamPlayer) {
        await prisma.teamPlayer.create({
          data: {
            teamId: invitation.teamId,
            playerId: invitation.playerId,
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error updating invitation:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Player already in team" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

