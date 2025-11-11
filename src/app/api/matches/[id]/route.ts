import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MatchStatus, ScoreStatus } from "@prisma/client"
import { validateTennisScore, convertToHomeAway, calculateGames, type SetScore } from "@/lib/tennis-scoring"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        league: true,
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
        squads: {
          include: {
            player: true,
            team: true,
          },
        },
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

    return NextResponse.json(match)
  } catch (error) {
    console.error("Error fetching match:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    // Check if user is captain of one of the teams, player in individual match, or manager
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        homeTeam: true,
        awayTeam: true,
        homePlayer: true,
        awayPlayer: true,
        league: {
          select: {
            format: true,
          },
        },
      },
    })

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    // Check authorization based on match type
    let isAuthorized = false
    
    // Managers and superadmins can always update
    const isManager = session.user.role === UserRole.MANAGER || session.user.role === UserRole.SUPERADMIN
    if (isManager) {
      isAuthorized = true
    } else {
      // For team-based matches, check if user is captain
      if (match.homeTeam && match.awayTeam) {
        const isCaptain =
          match.homeTeam.captainId === session.user.id ||
          match.awayTeam.captainId === session.user.id
        if (isCaptain) {
          isAuthorized = true
        }
      }
      // For individual matches, check if user is one of the players
      else if (match.homePlayer && match.awayPlayer) {
        const isPlayer =
          match.homePlayer.id === session.user.id ||
          match.awayPlayer.id === session.user.id
        if (isPlayer) {
          isAuthorized = true
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updateData: any = {}

    // Handle manager actions: approve score, direct entry, or edit
    if (isManager) {
      // Approve a specific score report
      if (data.approveScoreReportId) {
        const scoreReport = await prisma.matchScoreReport.findUnique({
          where: { id: data.approveScoreReportId },
        })

        if (!scoreReport || scoreReport.matchId !== params.id) {
          return NextResponse.json(
            { error: "Score report not found" },
            { status: 404 }
          )
        }

        // Check if user is manager of this league
        if (
          match.league.managerId !== session.user.id &&
          session.user.role !== UserRole.SUPERADMIN
        ) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }

        const setScores = scoreReport.setScores as SetScore[]
        const reporterIsHome =
          match.homePlayerId === scoreReport.reportedById ||
          match.homeTeamId === scoreReport.reportedById

        const { setsWonHome, setsWonAway, gamesWonHome, gamesWonAway } =
          convertToHomeAway(setScores, reporterIsHome)

        updateData.scoreStatus = ScoreStatus.APPROVED
        updateData.finalScoreReportId = scoreReport.id
        updateData.setsWonHome = setsWonHome
        updateData.setsWonAway = setsWonAway
        updateData.gamesWonHome = gamesWonHome
        updateData.gamesWonAway = gamesWonAway
        updateData.status = MatchStatus.PLAYED
        updateData.approvedById = session.user.id
        updateData.approvedAt = new Date()
      }
      // Manager direct entry
      else if (data.managerDirectEntry && data.sets) {
        const setScores: SetScore[] = data.sets.map((set: any) => ({
          reporter: parseInt(set.reporter),
          opponent: parseInt(set.opponent),
          tiebreak: set.tiebreak || false,
          tiebreakScore: set.tiebreakScore
            ? {
                reporter: parseInt(set.tiebreakScore.reporter),
                opponent: parseInt(set.tiebreakScore.opponent),
              }
            : undefined,
          superTiebreak: set.superTiebreak || false,
        }))

        const validation = validateTennisScore(setScores)
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        // Determine home/away perspective (assume sets are from home perspective)
        const { setsWonHome, setsWonAway, gamesWonHome, gamesWonAway } =
          convertToHomeAway(setScores, true)

        updateData.scoreStatus = ScoreStatus.MANAGER_ENTERED
        updateData.setsWonHome = setsWonHome
        updateData.setsWonAway = setsWonAway
        updateData.gamesWonHome = gamesWonHome
        updateData.gamesWonAway = gamesWonAway
        updateData.status = MatchStatus.PLAYED
        updateData.approvedById = session.user.id
        updateData.approvedAt = new Date()
      }
      // Manager editing approved score
      else if (
        (match.scoreStatus === ScoreStatus.APPROVED ||
          match.scoreStatus === ScoreStatus.MANAGER_ENTERED) &&
        data.sets
      ) {
        const setScores: SetScore[] = data.sets.map((set: any) => ({
          reporter: parseInt(set.reporter),
          opponent: parseInt(set.opponent),
          tiebreak: set.tiebreak || false,
          tiebreakScore: set.tiebreakScore
            ? {
                reporter: parseInt(set.tiebreakScore.reporter),
                opponent: parseInt(set.tiebreakScore.opponent),
              }
            : undefined,
          superTiebreak: set.superTiebreak || false,
        }))

        const validation = validateTennisScore(setScores)
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        const { setsWonHome, setsWonAway, gamesWonHome, gamesWonAway } =
          convertToHomeAway(setScores, true)

        updateData.setsWonHome = setsWonHome
        updateData.setsWonAway = setsWonAway
        updateData.gamesWonHome = gamesWonHome
        updateData.gamesWonAway = gamesWonAway
        updateData.approvedAt = new Date()
      }
      // Regular updates (status, scheduledDate)
      else {
        if (data.status) updateData.status = data.status as MatchStatus
        if (data.scheduledDate !== undefined)
          updateData.scheduledDate = data.scheduledDate
            ? new Date(data.scheduledDate)
            : null
      }
    } else {
      // Non-managers can only update scheduledDate
      if (data.scheduledDate !== undefined)
        updateData.scheduledDate = data.scheduledDate
          ? new Date(data.scheduledDate)
          : null
    }

    const updatedMatch = await prisma.match.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(updatedMatch)
  } catch (error) {
    console.error("Error updating match:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

