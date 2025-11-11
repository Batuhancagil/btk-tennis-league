import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MatchRequestStatus, NotificationType, MatchStatus, MatchType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const { leagueId, opponentId, message, suggestedDate, suggestedTime } = data

    if (!leagueId || !opponentId) {
      return NextResponse.json(
        { error: "League ID and opponent ID are required" },
        { status: 400 }
      )
    }

    // Validate user is in the league
    const leaguePlayer = await prisma.leaguePlayer.findUnique({
      where: {
        leagueId_playerId: {
          leagueId,
          playerId: session.user.id,
        },
      },
    })

    if (!leaguePlayer) {
      return NextResponse.json(
        { error: "You are not a member of this league" },
        { status: 403 }
      )
    }

    // Validate opponent is in the league
    const opponentInLeague = await prisma.leaguePlayer.findUnique({
      where: {
        leagueId_playerId: {
          leagueId,
          playerId: opponentId,
        },
      },
    })

    if (!opponentInLeague) {
      return NextResponse.json(
        { error: "Opponent is not a member of this league" },
        { status: 400 }
      )
    }

    if (session.user.id === opponentId) {
      return NextResponse.json(
        { error: "You cannot send a match request to yourself" },
        { status: 400 }
      )
    }

    // Check if there's already a pending request (not rejected)
    const existingRequest = await prisma.matchRequest.findFirst({
      where: {
        leagueId,
        requesterId: session.user.id,
        opponentId,
        status: {
          not: MatchRequestStatus.REJECTED,
        },
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending or accepted request with this opponent in this league" },
        { status: 400 }
      )
    }

    // Get league info
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    })

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    // Create match request
    const matchRequest = await prisma.matchRequest.create({
      data: {
        leagueId,
        requesterId: session.user.id,
        opponentId,
        message: message || null,
        suggestedDate: suggestedDate ? new Date(suggestedDate) : null,
        suggestedTime: suggestedTime || null,
        status: MatchRequestStatus.PENDING,
      },
      include: {
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
        league: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Create notification for opponent
    await prisma.notification.create({
      data: {
        userId: opponentId,
        type: NotificationType.MATCH_REQUEST,
        matchRequestId: matchRequest.id,
        message: `${session.user.name} sent you a match request in ${league.name}`,
      },
    })

    return NextResponse.json(matchRequest)
  } catch (error: any) {
    console.error("Error creating match request:", error)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A match request already exists between these players in this league" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get("type") // "sent" or "received"

    let where: any = {}

    if (type === "sent") {
      where.requesterId = session.user.id
    } else if (type === "received") {
      where.opponentId = session.user.id
    } else {
      // Get both sent and received
      where = {
        OR: [
          { requesterId: session.user.id },
          { opponentId: session.user.id },
        ],
      }
    }

    const matchRequests = await prisma.matchRequest.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        opponent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        league: {
          select: {
            id: true,
            name: true,
            format: true,
          },
        },
        match: {
          select: {
            id: true,
            status: true,
            scheduledDate: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(matchRequests)
  } catch (error) {
    console.error("Error fetching match requests:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

