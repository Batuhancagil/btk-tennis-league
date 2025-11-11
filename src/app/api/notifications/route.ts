import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    const where: any = {
      userId: session.user.id,
    }

    if (unreadOnly) {
      where.read = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        matchRequest: {
          select: {
            id: true,
            requesterId: true,
            opponentId: true,
            status: true,
            message: true,
            suggestedDate: true,
            suggestedTime: true,
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
        },
        match: {
          select: {
            id: true,
            scheduledDate: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to 50 most recent
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

