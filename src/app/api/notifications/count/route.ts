import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, InvitationStatus, MatchRequestStatus } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Count unread notifications
    const notificationCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    })

    // Also count pending invitations (for backward compatibility)
    let invitationCount = 0
    if (session.user.role === UserRole.PLAYER || session.user.role === UserRole.CAPTAIN) {
      if (session.user.role === UserRole.PLAYER) {
        invitationCount = await prisma.invitation.count({
          where: {
            playerId: session.user.id,
            status: InvitationStatus.PENDING,
          },
        })
      } else if (session.user.role === UserRole.CAPTAIN) {
        const teams = await prisma.team.findMany({
          where: { captainId: session.user.id },
          select: { id: true },
        })

        invitationCount = await prisma.invitation.count({
          where: {
            teamId: { in: teams.map((t) => t.id) },
            status: InvitationStatus.PENDING,
          },
        })
      }
    }

    // Count pending match requests
    const matchRequestCount = await prisma.matchRequest.count({
      where: {
        opponentId: session.user.id,
        status: MatchRequestStatus.PENDING,
      },
    })

    // Total count includes notifications, invitations, and match requests
    const totalCount = notificationCount + invitationCount + matchRequestCount

    return NextResponse.json({ 
      count: totalCount,
      notifications: notificationCount,
      invitations: invitationCount,
      matchRequests: matchRequestCount,
    })
  } catch (error) {
    console.error("Error fetching notification count:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

