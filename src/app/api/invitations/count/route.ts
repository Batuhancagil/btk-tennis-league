import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, InvitationStatus } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Players see their own pending invitations count
    if (session.user.role === UserRole.PLAYER) {
      const count = await prisma.invitation.count({
        where: {
          playerId: session.user.id,
          status: InvitationStatus.PENDING,
        },
      })
      return NextResponse.json({ count })
    }

    // Captains see pending invitations for their teams
    if (session.user.role === UserRole.CAPTAIN) {
      const teams = await prisma.team.findMany({
        where: { captainId: session.user.id },
        select: { id: true },
      })

      const count = await prisma.invitation.count({
        where: {
          teamId: { in: teams.map((t) => t.id) },
          status: InvitationStatus.PENDING,
        },
      })
      return NextResponse.json({ count })
    }

    return NextResponse.json({ count: 0 })
  } catch (error) {
    console.error("Error fetching invitation count:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

