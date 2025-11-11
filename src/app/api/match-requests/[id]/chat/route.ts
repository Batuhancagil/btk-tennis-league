import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NotificationType, MatchRequestChatMessageType, DateSuggestionStatus, MatchRequestStatus } from "@prisma/client"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get match request and verify user is part of it
    const matchRequest = await prisma.matchRequest.findUnique({
      where: { id: params.id },
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
        match: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!matchRequest) {
      return NextResponse.json({ error: "Match request not found" }, { status: 404 })
    }

    // Check if user is requester or opponent
    if (
      matchRequest.requesterId !== session.user.id &&
      matchRequest.opponentId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You are not part of this match request" },
        { status: 403 }
      )
    }

    // Only allow chat for PENDING and ACCEPTED requests
    if (
      matchRequest.status !== MatchRequestStatus.PENDING &&
      matchRequest.status !== MatchRequestStatus.ACCEPTED
    ) {
      return NextResponse.json(
        { error: "Chat is only available for pending or accepted match requests" },
        { status: 403 }
      )
    }

    // If match exists, use matchId, otherwise use matchRequestId
    const whereClause = matchRequest.match
      ? { matchId: matchRequest.match.id }
      : { matchRequestId: params.id }

    // Get chat messages
    const messages = await prisma.matchChat.findMany({
      where: whereClause,
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
    console.error("Error fetching match request chat messages:", error)
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
    const { message, action, suggestedDate, suggestedTime } = data

    // Get match request and verify user is part of it
    const matchRequest = await prisma.matchRequest.findUnique({
      where: { id: params.id },
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
        match: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!matchRequest) {
      return NextResponse.json({ error: "Match request not found" }, { status: 404 })
    }

    // Check if user is requester or opponent
    if (
      matchRequest.requesterId !== session.user.id &&
      matchRequest.opponentId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You are not part of this match request" },
        { status: 403 }
      )
    }

    // Only allow chat for PENDING and ACCEPTED requests
    if (
      matchRequest.status !== MatchRequestStatus.PENDING &&
      matchRequest.status !== MatchRequestStatus.ACCEPTED
    ) {
      return NextResponse.json(
        { error: "Chat is only available for pending or accepted match requests" },
        { status: 403 }
      )
    }

    // Determine which ID to use (matchId if match exists, otherwise matchRequestId)
    const matchId = matchRequest.match?.id || null
    const matchRequestId = matchRequest.match ? null : params.id

    // Handle date approval
    if (action === "approve-date") {
      const { messageId } = data

      if (!messageId) {
        return NextResponse.json(
          { error: "Message ID is required for date approval" },
          { status: 400 }
        )
      }

      // Get the date suggestion message
      const dateSuggestion = await prisma.matchChat.findUnique({
        where: { id: messageId },
      })

      if (
        !dateSuggestion ||
        dateSuggestion.messageType !== MatchRequestChatMessageType.DATE_SUGGESTION ||
        (dateSuggestion.matchRequestId !== params.id && dateSuggestion.matchId !== matchId)
      ) {
        return NextResponse.json(
          { error: "Date suggestion not found" },
          { status: 404 }
        )
      }

      // Only the opponent (not the suggester) can approve dates
      const isOpponent = matchRequest.opponentId === session.user.id
      const isSuggester = dateSuggestion.senderId === session.user.id

      if (!isOpponent || isSuggester) {
        return NextResponse.json(
          { error: "Only the opponent can approve date suggestions" },
          { status: 403 }
        )
      }

      if (dateSuggestion.dateStatus !== DateSuggestionStatus.PENDING) {
        return NextResponse.json(
          { error: "This date suggestion has already been processed" },
          { status: 400 }
        )
      }

      // Update the date suggestion status
      await prisma.matchChat.update({
        where: { id: messageId },
        data: {
          dateStatus: DateSuggestionStatus.APPROVED,
        },
      })

      // Update match request suggested date/time
      await prisma.matchRequest.update({
        where: { id: params.id },
        data: {
          suggestedDate: dateSuggestion.suggestedDate || undefined,
          suggestedTime: dateSuggestion.suggestedTime || undefined,
        },
      })

      // Update match scheduledDate if match exists
      if (matchRequest.match && dateSuggestion.suggestedDate) {
        await prisma.match.update({
          where: { id: matchRequest.match.id },
          data: {
            scheduledDate: dateSuggestion.suggestedDate,
          },
        })
      }

      // Create notification for the suggester
      await prisma.notification.create({
        data: {
          userId: dateSuggestion.senderId,
          type: NotificationType.MATCH_REQUEST,
          matchRequestId: matchRequest.id,
          matchId: matchRequest.match?.id || null,
          message: `${session.user.name} approved your date suggestion for the match request in ${matchRequest.league.name}`,
        },
      })

      // Fetch updated messages
      const whereClause = matchId ? { matchId } : { matchRequestId: params.id }
      const messages = await prisma.matchChat.findMany({
        where: whereClause,
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

      return NextResponse.json({ success: true, messages })
    }

    // Handle date rejection
    if (action === "reject-date") {
      const { messageId } = data

      if (!messageId) {
        return NextResponse.json(
          { error: "Message ID is required for date rejection" },
          { status: 400 }
        )
      }

      // Get the date suggestion message
      const dateSuggestion = await prisma.matchChat.findUnique({
        where: { id: messageId },
      })

      if (
        !dateSuggestion ||
        dateSuggestion.messageType !== MatchRequestChatMessageType.DATE_SUGGESTION ||
        (dateSuggestion.matchRequestId !== params.id && dateSuggestion.matchId !== matchId)
      ) {
        return NextResponse.json(
          { error: "Date suggestion not found" },
          { status: 404 }
        )
      }

      // Only the opponent (not the suggester) can reject dates
      const isOpponent = matchRequest.opponentId === session.user.id
      const isSuggester = dateSuggestion.senderId === session.user.id

      if (!isOpponent || isSuggester) {
        return NextResponse.json(
          { error: "Only the opponent can reject date suggestions" },
          { status: 403 }
        )
      }

      if (dateSuggestion.dateStatus !== DateSuggestionStatus.PENDING) {
        return NextResponse.json(
          { error: "This date suggestion has already been processed" },
          { status: 400 }
        )
      }

      // Update the date suggestion status
      await prisma.matchChat.update({
        where: { id: messageId },
        data: {
          dateStatus: DateSuggestionStatus.REJECTED,
        },
      })

      // Fetch updated messages
      const whereClause = matchId ? { matchId } : { matchRequestId: params.id }
      const messages = await prisma.matchChat.findMany({
        where: whereClause,
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

      return NextResponse.json({ success: true, messages })
    }

    // Handle date suggestion
    if (action === "suggest-date") {
      if (!suggestedDate) {
        return NextResponse.json(
          { error: "Suggested date is required" },
          { status: 400 }
        )
      }

      // Create date suggestion message
      const chatMessage = await prisma.matchChat.create({
        data: {
          matchId,
          matchRequestId,
          senderId: session.user.id,
          message: `Tarih önerisi: ${new Date(suggestedDate).toLocaleDateString("tr-TR")}${suggestedTime ? ` ${suggestedTime}` : ""}`,
          messageType: MatchRequestChatMessageType.DATE_SUGGESTION,
          suggestedDate: new Date(suggestedDate),
          suggestedTime: suggestedTime || null,
          dateStatus: DateSuggestionStatus.PENDING,
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

      // Create notification for the other player
      const otherPlayerId =
        matchRequest.requesterId === session.user.id
          ? matchRequest.opponentId
          : matchRequest.requesterId

      await prisma.notification.create({
        data: {
          userId: otherPlayerId,
          type: NotificationType.MATCH_REQUEST,
          matchRequestId: matchRequest.id,
          matchId: matchRequest.match?.id || null,
          message: `${session.user.name} suggested a new date for your match request in ${matchRequest.league.name}`,
        },
      })

      return NextResponse.json(chatMessage)
    }

    // Handle regular text message
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Create chat message
    const chatMessage = await prisma.matchChat.create({
      data: {
        matchId,
        matchRequestId,
        senderId: session.user.id,
        message: message.trim(),
        messageType: MatchRequestChatMessageType.TEXT,
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

    // Create notification for the other player
    const otherPlayerId =
      matchRequest.requesterId === session.user.id
        ? matchRequest.opponentId
        : matchRequest.requesterId

    await prisma.notification.create({
      data: {
        userId: otherPlayerId,
        type: NotificationType.MATCH_MESSAGE,
        matchRequestId: matchRequest.id,
        matchId: matchRequest.match?.id || null,
        message: `${session.user.name} sent a message in your match request`,
      },
    })

    return NextResponse.json(chatMessage)
  } catch (error) {
    console.error("Error sending match request chat message:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
