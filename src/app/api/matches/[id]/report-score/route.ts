import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MatchStatus, ScoreStatus } from "@prisma/client"
import { validateTennisScore, calculateGames, type SetScore } from "@/lib/tennis-scoring"

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
    const { sets } = data

    // Validate input
    if (!sets || !Array.isArray(sets) || sets.length < 2) {
      return NextResponse.json(
        { error: "En az 2 set skoru girilmelidir" },
        { status: 400 }
      )
    }

    // Parse set scores
    const setScores: SetScore[] = sets.map((set: any) => ({
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

    // Validate tennis score
    const validation = validateTennisScore(setScores)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Get match with relations
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
            managerId: true,
          },
        },
        squads: {
          include: {
            player: true,
          },
        },
      },
    })

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    // Check if match is PLAYED
    if (match.status !== MatchStatus.PLAYED) {
      return NextResponse.json(
        { error: "Maç PLAYED durumunda olmalıdır" },
        { status: 400 }
      )
    }

    // Check if user is part of the match
    let isHomePlayer = false
    let isAwayPlayer = false

    if (match.league.format === "INDIVIDUAL") {
      if (match.homePlayerId === session.user.id) {
        isHomePlayer = true
      } else if (match.awayPlayerId === session.user.id) {
        isAwayPlayer = true
      } else {
        return NextResponse.json(
          { error: "Bu maçta oyuncu değilsiniz" },
          { status: 403 }
        )
      }
    } else {
      // Team-based match
      const playerSquad = match.squads.find(
        (s) => s.player.id === session.user.id
      )
      if (!playerSquad) {
        return NextResponse.json(
          { error: "Bu maçta oyuncu değilsiniz" },
          { status: 403 }
        )
      }
      if (playerSquad.teamId === match.homeTeamId) {
        isHomePlayer = true
      } else {
        isAwayPlayer = true
      }
    }

    // Check if score is already approved
    if (match.scoreStatus === ScoreStatus.APPROVED || match.scoreStatus === ScoreStatus.MANAGER_ENTERED) {
      return NextResponse.json(
        { error: "Bu maç skoru zaten onaylanmış" },
        { status: 400 }
      )
    }

    // Calculate sets won/lost and games
    let setsWon = 0
    let setsLost = 0

    for (const set of setScores) {
      if (set.reporter > set.opponent) {
        setsWon++
      } else {
        setsLost++
      }
    }

    const { gamesWon, gamesLost } = calculateGames(setScores)

    // Upsert score report
    const scoreReport = await prisma.matchScoreReport.upsert({
      where: {
        matchId_reportedById: {
          matchId: params.id,
          reportedById: session.user.id,
        },
      },
      update: {
        setsWon,
        setsLost,
        gamesWon,
        gamesLost,
        setScores: setScores as any,
      },
      create: {
        matchId: params.id,
        reportedById: session.user.id,
        setsWon,
        setsLost,
        gamesWon,
        gamesLost,
        setScores: setScores as any,
      },
    })

    // Update match scoreStatus
    let newScoreStatus: ScoreStatus = match.scoreStatus

    if (match.scoreStatus === ScoreStatus.PENDING) {
      newScoreStatus = isHomePlayer ? ScoreStatus.REPORTED_BY_HOME : ScoreStatus.REPORTED_BY_AWAY
    } else if (
      match.scoreStatus === ScoreStatus.REPORTED_BY_HOME &&
      isAwayPlayer
    ) {
      newScoreStatus = ScoreStatus.REPORTED_BY_BOTH
    } else if (
      match.scoreStatus === ScoreStatus.REPORTED_BY_AWAY &&
      isHomePlayer
    ) {
      newScoreStatus = ScoreStatus.REPORTED_BY_BOTH
    }

    await prisma.match.update({
      where: { id: params.id },
      data: { scoreStatus: newScoreStatus },
    })

    return NextResponse.json({
      success: true,
      scoreReport,
      scoreStatus: newScoreStatus,
    })
  } catch (error) {
    console.error("Error reporting score:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

