import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MatchStatus, ScoreStatus } from "@prisma/client"
import { convertToHomeAway, type SetScore } from "@/lib/tennis-scoring"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only managers and superadmins can approve matches
    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const data = await req.json()
    const scoreReportId = data.scoreReportId

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        league: true,
        scoreReports: {
          include: {
            reporter: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    // Check if user is manager of this league
    if (
      match.league.managerId !== session.user.id &&
      session.user.role !== UserRole.SUPERADMIN
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (!scoreReportId) {
      return NextResponse.json(
        { error: "scoreReportId is required" },
        { status: 400 }
      )
    }

    const scoreReport = match.scoreReports.find((r) => r.id === scoreReportId)
    if (!scoreReport) {
      return NextResponse.json(
        { error: "Score report not found" },
        { status: 404 }
      )
    }

    const setScores = scoreReport.setScores as unknown as SetScore[]
    const reporterIsHome =
      match.homePlayerId === scoreReport.reportedById ||
      match.homeTeamId === scoreReport.reportedById

    const { setsWonHome, setsWonAway, gamesWonHome, gamesWonAway } =
      convertToHomeAway(setScores, reporterIsHome)

    const updatedMatch = await prisma.match.update({
      where: { id: params.id },
      data: {
        scoreStatus: ScoreStatus.APPROVED,
        finalScoreReportId: scoreReportId,
        setsWonHome,
        setsWonAway,
        gamesWonHome,
        gamesWonAway,
        status: MatchStatus.PLAYED,
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
      include: {
        league: true,
        homeTeam: true,
        awayTeam: true,
        homePlayer: {
          select: {
            id: true,
            name: true,
          },
        },
        awayPlayer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(updatedMatch)
  } catch (error) {
    console.error("Error approving match:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

