import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MatchRequestStatus, NotificationType, MatchStatus, MatchType } from "@prisma/client"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const { action } = data // "accept" or "reject"

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'accept' or 'reject'" },
        { status: 400 }
      )
    }

    // Get match request
    const matchRequest = await prisma.matchRequest.findUnique({
      where: { id: params.id },
      include: {
        league: true,
        requester: {
          select: {
            id: true,
            name: true,
          },
        },
        opponent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!matchRequest) {
      return NextResponse.json({ error: "Match request not found" }, { status: 404 })
    }

    // Check if user is the opponent (only opponent can accept/reject)
    if (matchRequest.opponentId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only accept/reject requests sent to you" },
        { status: 403 }
      )
    }

    if (matchRequest.status !== MatchRequestStatus.PENDING) {
      return NextResponse.json(
        { error: "This match request has already been processed" },
        { status: 400 }
      )
    }

    if (action === "reject") {
      // Update status to REJECTED
      const updatedRequest = await prisma.matchRequest.update({
        where: { id: params.id },
        data: {
          status: MatchRequestStatus.REJECTED,
        },
      })

      // Create notification for requester
      await prisma.notification.create({
        data: {
          userId: matchRequest.requesterId,
          type: NotificationType.MATCH_REJECTED,
          matchRequestId: matchRequest.id,
          message: `${session.user.name} rejected your match request in ${matchRequest.league.name}`,
        },
      })

      return NextResponse.json(updatedRequest)
    }

    // Action is "accept"
    // Create the match
    const scheduledDate = matchRequest.suggestedDate
      ? new Date(matchRequest.suggestedDate)
      : null

    // Determine match type based on league format
    const matchType = matchRequest.league.format === "INDIVIDUAL" ? MatchType.SINGLE : MatchType.DOUBLE

    const match = await prisma.match.create({
      data: {
        leagueId: matchRequest.leagueId,
        homePlayerId: matchRequest.requesterId,
        awayPlayerId: matchRequest.opponentId,
        category: matchRequest.league.category,
        matchType,
        scheduledDate,
        status: MatchStatus.SCHEDULED,
        matchRequestId: matchRequest.id,
      },
    })

    // Update match request status to ACCEPTED
    const updatedRequest = await prisma.matchRequest.update({
      where: { id: params.id },
      data: {
        status: MatchRequestStatus.ACCEPTED,
      },
    })

    // Migrate chat messages from matchRequestId to matchId
    await prisma.matchChat.updateMany({
      where: {
        matchRequestId: params.id,
        matchId: null,
      },
      data: {
        matchId: match.id,
        matchRequestId: null, // Keep matchRequestId for reference, or set to null
      },
    })

    // Create notifications
    await prisma.notification.createMany({
      data: [
        {
          userId: matchRequest.requesterId,
          type: NotificationType.MATCH_ACCEPTED,
          matchRequestId: matchRequest.id,
          matchId: match.id,
          message: `${session.user.name} accepted your match request in ${matchRequest.league.name}`,
        },
        {
          userId: matchRequest.opponentId,
          type: NotificationType.MATCH_ACCEPTED,
          matchRequestId: matchRequest.id,
          matchId: match.id,
          message: `You accepted ${matchRequest.requester.name}'s match request in ${matchRequest.league.name}`,
        },
      ],
    })

    return NextResponse.json({
      matchRequest: updatedRequest,
      match,
    })
  } catch (error) {
    console.error("Error updating match request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

