"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import Navbar from "@/components/Navbar"
import Link from "next/link"
import { MatchStatus, MatchType, LeagueFormat, ScoreStatus } from "@prisma/client"
import TennisScoreInput from "@/components/TennisScoreInput"
import MatchChat from "@/components/MatchChat"
import { formatTennisScore, type SetScore } from "@/lib/tennis-scoring"

interface Match {
  id: string
  league: {
    id: string
    name: string
    format?: LeagueFormat
  }
  homeTeam: {
    id: string
    name: string
  } | null
  awayTeam: {
    id: string
    name: string
  } | null
  homePlayer: {
    id: string
    name: string
  } | null
  awayPlayer: {
    id: string
    name: string
  } | null
  matchType: MatchType
  scheduledDate: string | null
  status: MatchStatus
  scoreStatus: ScoreStatus
  homeScore: number | null
  awayScore: number | null
  setsWonHome: number | null
  setsWonAway: number | null
  gamesWonHome: number | null
  gamesWonAway: number | null
  squads: Array<{
    teamId: string
    player: {
      id: string
      name: string
    }
  }>
  scoreReports?: Array<{
    id: string
    reportedById: string
    setsWon: number
    setsLost: number
    gamesWon: number
    gamesLost: number
    setScores: SetScore[]
    createdAt: string
    reporter: {
      id: string
      name: string
    }
  }>
  matchRequestId?: string | null
}

export default function PlayerMatchesPage() {
  const { data: session } = useSession()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [expandedChatMatchId, setExpandedChatMatchId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalMatches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  })

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches?playerId=${session?.user.id}`)
      const data = await res.json()
      // Filter matches where player participated (either in team squads or as individual player)
      const playerMatches = data.filter((match: Match) => {
        // Individual league matches
        if (match.league.format === LeagueFormat.INDIVIDUAL) {
          return match.homePlayer?.id === session?.user.id || match.awayPlayer?.id === session?.user.id
        }
        // Team-based matches
        return match.squads.some((squad) => squad.player.id === session?.user.id)
      })
      setMatches(playerMatches)
    } catch (error) {
      console.error("Error fetching matches:", error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const handleMarkAsPlayed = async (matchId: string) => {
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: MatchStatus.PLAYED }),
      })
      if (res.ok) {
        fetchMatches()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error marking match as played:", error)
      alert("Hata oluştu")
    }
  }

  const handleReportScore = async (sets: SetScore[]) => {
    if (!selectedMatch) return

    try {
      const res = await fetch(`/api/matches/${selectedMatch.id}/report-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sets }),
      })

      if (res.ok) {
        setShowScoreForm(false)
        setSelectedMatch(null)
        fetchMatches()
        alert("Skor başarıyla bildirildi")
      } else {
        const error = await res.json()
        alert(error.error || "Skor bildirilirken hata oluştu")
      }
    } catch (error) {
      console.error("Error reporting score:", error)
      alert("Skor bildirilirken hata oluştu")
    }
  }

  const calculateStats = useCallback(() => {
    const playedMatches = matches.filter(
      (m) =>
        m.status === MatchStatus.PLAYED &&
        (m.scoreStatus === ScoreStatus.APPROVED || m.scoreStatus === ScoreStatus.MANAGER_ENTERED) &&
        m.setsWonHome !== null &&
        m.setsWonAway !== null
    )

    let wins = 0
    let losses = 0

    playedMatches.forEach((match) => {
      let playerSetsWon: number | null = null
      let opponentSetsWon: number | null = null

      if (match.league.format === LeagueFormat.INDIVIDUAL) {
        // Individual league match
        if (match.homePlayer?.id === session?.user.id) {
          playerSetsWon = match.setsWonHome!
          opponentSetsWon = match.setsWonAway!
        } else if (match.awayPlayer?.id === session?.user.id) {
          playerSetsWon = match.setsWonAway!
          opponentSetsWon = match.setsWonHome!
        } else {
          return
        }
      } else {
        // Team-based match
        const playerSquad = match.squads.find((s) => s.player.id === session?.user.id)
        if (!playerSquad || !match.homeTeam || !match.awayTeam) return

        const isHomeTeam = playerSquad.teamId === match.homeTeam.id
        playerSetsWon = isHomeTeam ? match.setsWonHome! : match.setsWonAway!
        opponentSetsWon = isHomeTeam ? match.setsWonAway! : match.setsWonHome!
      }

      if (playerSetsWon === null || opponentSetsWon === null) return

      if (playerSetsWon > opponentSetsWon) {
        wins++
      } else {
        losses++
      }
    })

    setStats({
      totalMatches: playedMatches.length,
      wins,
      losses,
      draws: 0, // No draws in tennis
    })
  }, [matches, session?.user?.id])

  useEffect(() => {
    if (session?.user) {
      fetchMatches()
    }
  }, [session, fetchMatches])

  useEffect(() => {
    if (matches.length > 0) {
      calculateStats()
    }
  }, [matches, calculateStats])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Maç Geçmişi</h1>
          <Link
            href="/player"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Geri
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500 mb-1">Toplam Maç</h3>
            <p className="text-2xl font-bold">{stats.totalMatches}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500 mb-1">Galibiyet</h3>
            <p className="text-2xl font-bold text-green-600">{stats.wins}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500 mb-1">Mağlubiyet</h3>
            <p className="text-2xl font-bold text-red-600">{stats.losses}</p>
          </div>
        </div>

        <div className="space-y-4">
          {matches.map((match) => {
            const isIndividual = match.league.format === LeagueFormat.INDIVIDUAL
            let isHome: boolean
            let playerName: string
            let opponentName: string

            if (isIndividual) {
              if (match.homePlayer?.id === session?.user.id && match.homePlayer) {
                isHome = true
                playerName = match.homePlayer.name
                opponentName = match.awayPlayer?.name || "Bilinmeyen"
              } else if (match.awayPlayer?.id === session?.user.id && match.awayPlayer) {
                isHome = false
                playerName = match.awayPlayer.name
                opponentName = match.homePlayer?.name || "Bilinmeyen"
              } else {
                return null
              }
            } else {
              const playerSquad = match.squads.find((s) => s.player.id === session?.user.id)
              if (!playerSquad || !match.homeTeam || !match.awayTeam) return null

              isHome = playerSquad.teamId === match.homeTeam.id
              playerName = isHome ? match.homeTeam.name : match.awayTeam.name
              opponentName = isHome ? match.awayTeam.name : match.homeTeam.name
            }

            const myScoreReport = match.scoreReports?.find(
              (r) => r.reportedById === session?.user.id
            )
            const opponentScoreReport = match.scoreReports?.find(
              (r) => r.reportedById !== session?.user.id
            )

            return (
              <div key={match.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="mb-2">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {match.league.name}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold mt-2">
                      {match.homePlayer?.name || match.homeTeam?.name || "Bilinmeyen"} vs{" "}
                      {match.awayPlayer?.name || match.awayTeam?.name || "Bilinmeyen"}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {match.matchType === MatchType.SINGLE ? "Single" : "Double"} -{" "}
                      {match.scheduledDate
                        ? new Date(match.scheduledDate).toLocaleDateString("tr-TR")
                        : "Tarih belirlenmedi"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        match.status === MatchStatus.PLAYED
                          ? "bg-green-100 text-green-800"
                          : match.status === MatchStatus.CANCELLED
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {match.status === MatchStatus.PLAYED
                        ? "Oynandı"
                        : match.status === MatchStatus.CANCELLED
                        ? "İptal"
                        : "Planlandı"}
                    </span>
                    {match.scoreStatus &&
                      match.scoreStatus !== ScoreStatus.APPROVED &&
                      match.scoreStatus !== ScoreStatus.MANAGER_ENTERED &&
                      match.scoreStatus !== ScoreStatus.PENDING && (
                        <span className="px-2 py-1 rounded text-sm bg-orange-100 text-orange-800">
                          Onay Bekliyor
                        </span>
                      )}
                  </div>
                </div>

                {/* Approved Score Display */}
                {(match.scoreStatus === ScoreStatus.APPROVED ||
                  match.scoreStatus === ScoreStatus.MANAGER_ENTERED) &&
                  match.setsWonHome !== null &&
                  match.setsWonAway !== null && (
                    <div className="mb-4 p-4 bg-gray-50 rounded">
                      <p className="text-lg font-semibold mb-2">Maç Skoru</p>
                      <p className="text-xl font-bold">
                        {match.setsWonHome} - {match.setsWonAway} Set
                      </p>
                      {isHome ? (
                        match.setsWonHome > match.setsWonAway ? (
                          <p className="text-green-600 font-medium mt-2">✓ Galibiyet</p>
                        ) : (
                          <p className="text-red-600 font-medium mt-2">✗ Mağlubiyet</p>
                        )
                      ) : match.setsWonAway > match.setsWonHome ? (
                        <p className="text-green-600 font-medium mt-2">✓ Galibiyet</p>
                      ) : (
                        <p className="text-red-600 font-medium mt-2">✗ Mağlubiyet</p>
                      )}
                    </div>
                  )}

                {/* Score Reports Display */}
                {match.scoreReports && match.scoreReports.length > 0 && (
                  <div className="mb-4 p-4 bg-gray-50 rounded">
                    <p className="font-semibold mb-2">Bildirilen Skorlar</p>
                    {myScoreReport && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-600">
                          <strong>Sizin bildirdiğiniz:</strong>{" "}
                          {formatTennisScore(myScoreReport.setScores as SetScore[])}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(myScoreReport.createdAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    )}
                    {opponentScoreReport && (
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Rakibin bildirdiği:</strong>{" "}
                          {formatTennisScore(opponentScoreReport.setScores as SetScore[])}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(opponentScoreReport.createdAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {match.status === MatchStatus.SCHEDULED && (
                    <button
                      onClick={() => handleMarkAsPlayed(match.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Maç Bitti
                    </button>
                  )}
                  {match.status === MatchStatus.PLAYED &&
                    match.scoreStatus !== ScoreStatus.APPROVED &&
                    match.scoreStatus !== ScoreStatus.MANAGER_ENTERED && (
                      <button
                        onClick={() => {
                          setSelectedMatch(match)
                          setShowScoreForm(true)
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        {myScoreReport ? "Skoru Güncelle" : "Skor Bildir"}
                      </button>
                    )}
                  {/* Chat button - show for matches created from match requests (accepted matches) */}
                  {match.matchRequestId && (
                    <button
                      onClick={() => {
                        setExpandedChatMatchId(
                          expandedChatMatchId === match.id ? null : match.id
                        )
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      {expandedChatMatchId === match.id ? "Chat'i Kapat" : "Chat"}
                    </button>
                  )}
                </div>

                {/* Chat Section */}
                {expandedChatMatchId === match.id && match.matchRequestId && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-semibold mb-3">Maç Chat&apos;i</h3>
                    <div className="h-96">
                      <MatchChat matchId={match.id} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {matches.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">Henüz maç geçmişiniz yok</p>
            </div>
          )}
        </div>

        {/* Score Reporting Modal */}
        {showScoreForm && selectedMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Skor Bildir</h2>
              <p className="text-gray-600 mb-4">
                {selectedMatch.league.name} -{" "}
                {selectedMatch.homePlayer?.name ||
                  selectedMatch.homeTeam?.name ||
                  "Bilinmeyen"}{" "}
                vs{" "}
                {selectedMatch.awayPlayer?.name ||
                  selectedMatch.awayTeam?.name ||
                  "Bilinmeyen"}
              </p>
              <TennisScoreInput
                onSubmit={handleReportScore}
                onCancel={() => {
                  setShowScoreForm(false)
                  setSelectedMatch(null)
                }}
                initialSets={
                  selectedMatch.scoreReports?.find(
                    (r) => r.reportedById === session?.user.id
                  )?.setScores as SetScore[] | undefined
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

