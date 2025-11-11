import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NotificationType } from "@prisma/client"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get match and verify user is part of it
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        homePlayer: true,
        awayPlayer: true,
        homeTeam: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
        awayTeam: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    })

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    // Check if user is part of the match
    let isPartOfMatch = false

    if (match.homePlayerId && match.awayPlayerId) {
      // Individual match
      isPartOfMatch =
        match.homePlayerId === session.user.id ||
        match.awayPlayerId === session.user.id
    } else if (match.homeTeam && match.awayTeam) {
      // Team match
      const homePlayerIds = match.homeTeam.players.map((p) => p.playerId)
      const awayPlayerIds = match.awayTeam.players.map((p) => p.playerId)
      isPartOfMatch =
        homePlayerIds.includes(session.user.id) ||
        awayPlayerIds.includes(session.user.id)
    }

    if (!isPartOfMatch) {
      return NextResponse.json(
        { error: "You are not part of this match" },
        { status: 403 }
      )
    }

    // Get chat messages
    const messages = await prisma.matchChat.findMany({
      where: { matchId: params.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching chat messages:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
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

    const data = await req.json()
    const { message } = data

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Get match and verify user is part of it
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        homePlayer: true,
        awayPlayer: true,
        homeTeam: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
        awayTeam: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    })

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    // Check if user is part of the match
    let isPartOfMatch = false

    if (match.homePlayerId && match.awayPlayerId) {
      // Individual match
      isPartOfMatch =
        match.homePlayerId === session.user.id ||
        match.awayPlayerId === session.user.id
    } else if (match.homeTeam && match.awayTeam) {
      // Team match
      const homePlayerIds = match.homeTeam.players.map((p) => p.playerId)
      const awayPlayerIds = match.awayTeam.players.map((p) => p.playerId)
      isPartOfMatch =
        homePlayerIds.includes(session.user.id) ||
        awayPlayerIds.includes(session.user.id)
    }

    if (!isPartOfMatch) {
      return NextResponse.json(
        { error: "You are not part of this match" },
        { status: 403 }
      )
    }

    // Create chat message
    const chatMessage = await prisma.matchChat.create({
      data: {
        matchId: params.id,
        senderId: session.user.id,
        message: message.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    // Create notification for the other player(s)
    if (match.homePlayerId && match.awayPlayerId) {
      // Individual match - notify the other player
      const otherPlayerId =
        match.homePlayerId === session.user.id
          ? match.awayPlayerId
          : match.homePlayerId

      await prisma.notification.create({
        data: {
          userId: otherPlayerId,
          type: NotificationType.MATCH_MESSAGE,
          matchId: match.id,
          message: `${session.user.name} sent a message in your match`,
        },
      })
    } else if (match.homeTeam && match.awayTeam) {
      // Team match - notify all players in the other team
      const isHomeTeam = match.homeTeam.players.some(
        (p) => p.playerId === session.user.id
      )
      const otherTeamPlayers = isHomeTeam
        ? match.awayTeam.players.map((p) => p.playerId)
        : match.homeTeam.players.map((p) => p.playerId)

      await prisma.notification.createMany({
        data: otherTeamPlayers.map((playerId) => ({
          userId: playerId,
          type: NotificationType.MATCH_MESSAGE,
          matchId: match.id,
          message: `${session.user.name} sent a message in your match`,
        })),
      })
    }

    return NextResponse.json(chatMessage)
  } catch (error) {
    console.error("Error sending chat message:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

