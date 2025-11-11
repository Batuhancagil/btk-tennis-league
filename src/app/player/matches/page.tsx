"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import Navbar from "@/components/Navbar"
import Link from "next/link"
import { MatchStatus, MatchType, LeagueFormat } from "@prisma/client"

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
  homeScore: number | null
  awayScore: number | null
  squads: Array<{
    teamId: string
    player: {
      id: string
      name: string
    }
  }>
}

export default function PlayerMatchesPage() {
  const { data: session } = useSession()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
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

  const calculateStats = useCallback(() => {
    const playedMatches = matches.filter(
      (m) => m.status === MatchStatus.PLAYED && m.homeScore !== null && m.awayScore !== null
    )

    let wins = 0
    let losses = 0
    let draws = 0

    playedMatches.forEach((match) => {
      let playerScore: number | null = null
      let opponentScore: number | null = null

      if (match.league.format === LeagueFormat.INDIVIDUAL) {
        // Individual league match
        if (match.homePlayer?.id === session?.user.id) {
          playerScore = match.homeScore!
          opponentScore = match.awayScore!
        } else if (match.awayPlayer?.id === session?.user.id) {
          playerScore = match.awayScore!
          opponentScore = match.homeScore!
        } else {
          return
        }
      } else {
        // Team-based match
        const playerSquad = match.squads.find((s) => s.player.id === session?.user.id)
        if (!playerSquad || !match.homeTeam || !match.awayTeam) return

        const isHomeTeam = playerSquad.teamId === match.homeTeam.id
        playerScore = isHomeTeam ? match.homeScore! : match.awayScore!
        opponentScore = isHomeTeam ? match.awayScore! : match.homeScore!
      }

      if (playerScore === null || opponentScore === null) return

      if (playerScore > opponentScore) {
        wins++
      } else if (playerScore < opponentScore) {
        losses++
      } else {
        draws++
      }
    })

    setStats({
      totalMatches: playedMatches.length,
      wins,
      losses,
      draws,
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

        <div className="grid gap-6 md:grid-cols-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500 mb-1">Toplam Maç</h3>
            <p className="text-2xl font-bold">{stats.totalMatches}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500 mb-1">Galibiyet</h3>
            <p className="text-2xl font-bold text-green-600">{stats.wins}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500 mb-1">Beraberlik</h3>
            <p className="text-2xl font-bold text-yellow-600">{stats.draws}</p>
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
              if (match.homePlayer?.id === session?.user.id) {
                isHome = true
                playerName = match.homePlayer.name
                opponentName = match.awayPlayer?.name || "Bilinmeyen"
              } else if (match.awayPlayer?.id === session?.user.id) {
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

            return (
              <div key={match.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{match.league.name}</h2>
                    <p className="text-gray-600">
                      {match.homePlayer?.name || match.homeTeam?.name || "Bilinmeyen"} vs{" "}
                      {match.awayPlayer?.name || match.awayTeam?.name || "Bilinmeyen"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {match.matchType === MatchType.SINGLE ? "Single" : "Double"} -{" "}
                      {match.scheduledDate
                        ? new Date(match.scheduledDate).toLocaleDateString("tr-TR")
                        : "Tarih belirlenmedi"}
                    </p>
                  </div>
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
                </div>

                {match.status === MatchStatus.PLAYED && match.homeScore !== null && match.awayScore !== null && (
                  <div className="mb-4">
                    <p className="text-lg font-semibold">
                      Skor: {match.homeScore} - {match.awayScore}
                    </p>
                    <p className="text-sm text-gray-600">
                      {isIndividual ? "Sizin skorunuz" : `Takımınız (${playerName})`}:{" "}
                      {isHome ? match.homeScore : match.awayScore}
                    </p>
                    {isHome ? (
                      match.homeScore > match.awayScore ? (
                        <p className="text-green-600 font-medium">✓ Galibiyet</p>
                      ) : match.homeScore < match.awayScore ? (
                        <p className="text-red-600 font-medium">✗ Mağlubiyet</p>
                      ) : (
                        <p className="text-yellow-600 font-medium">= Beraberlik</p>
                      )
                    ) : match.awayScore > match.homeScore ? (
                      <p className="text-green-600 font-medium">✓ Galibiyet</p>
                    ) : match.awayScore < match.homeScore ? (
                      <p className="text-red-600 font-medium">✗ Mağlubiyet</p>
                    ) : (
                      <p className="text-yellow-600 font-medium">= Beraberlik</p>
                    )}
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
      </div>
    </div>
  )
}

