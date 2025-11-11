"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import Navbar from "@/components/Navbar"
import { MatchType, MatchStatus } from "@prisma/client"
import Link from "next/link"

interface Match {
  id: string
  league: {
    id: string
    name: string
    format?: string
  }
  homeTeam: {
    id: string
    name: string
  } | null
  awayTeam: {
    id: string
    name: string
  } | null
  category: string
  matchType: MatchType
  scheduledDate: string | null
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  squads: Array<{
    id: string
    teamId: string
    player: {
      id: string
      name: string
    }
    position: number
  }>
}

export default function CaptainMatchesPage() {
  const { data: session } = useSession()
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/teams")
      const data = await res.json()
      const myTeams = data.filter((team: any) => team.captain.id === session?.user.id)
      setTeams(myTeams)
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }, [session?.user?.id])

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/matches")
      const data = await res.json()
      // Filter matches where user is captain of one of the teams (only team-based matches)
      const myMatches = data.filter((match: Match) => {
        // Skip individual league matches (captains don't manage individual leagues)
        if (match.league.format === "INDIVIDUAL") return false
        if (!match.homeTeam || !match.awayTeam) return false
        
        const myTeamIds = teams.map((t) => t.id)
        return myTeamIds.includes(match.homeTeam.id) || myTeamIds.includes(match.awayTeam.id)
      })
      setMatches(myMatches)
    } catch (error) {
      console.error("Error fetching matches:", error)
    } finally {
      setLoading(false)
    }
  }, [teams])

  useEffect(() => {
    if (session?.user) {
      fetchTeams()
    }
  }, [session, fetchTeams])

  useEffect(() => {
    if (teams.length > 0) {
      fetchMatches()
    }
  }, [teams, fetchMatches])

  const handleSetSquad = async (matchId: string, teamId: string) => {
    // This would open a modal to select players
    // For now, redirect to a dedicated page
    window.location.href = `/captain/matches/${matchId}/squad?teamId=${teamId}`
  }

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMatch) return

    try {
      const res = await fetch(`/api/matches/${selectedMatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeScore: parseInt(homeScore),
          awayScore: parseInt(awayScore),
        }),
      })
      if (res.ok) {
        setShowScoreForm(false)
        setSelectedMatch(null)
        fetchMatches()
      }
    } catch (error) {
      console.error("Error submitting score:", error)
    }
  }

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
          <h1 className="text-3xl font-bold">Maçlarım</h1>
          <Link
            href="/captain"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Geri
          </Link>
        </div>

        <div className="space-y-4">
          {matches.map((match) => {
            const isHomeTeam = teams.some((t) => t.id === match.homeTeam.id)
            const myTeam = isHomeTeam ? match.homeTeam : match.awayTeam
            const opponentTeam = isHomeTeam ? match.awayTeam : match.homeTeam

            return (
              <div key={match.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{match.league.name}</h2>
                    <p className="text-gray-600">
                      {match.homeTeam.name} vs {match.awayTeam.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {match.matchType === MatchType.SINGLE ? "Single" : "Double"} -{" "}
                      {match.category === "MALE" ? "Erkek" : match.category === "FEMALE" ? "Kadın" : "Mix"}
                    </p>
                    {match.scheduledDate && (
                      <p className="text-sm text-gray-500">
                        {new Date(match.scheduledDate).toLocaleDateString("tr-TR")}
                      </p>
                    )}
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
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Kadro ({myTeam.name})</h3>
                  {match.squads.filter((s) => s.teamId === myTeam.id).length > 0 ? (
                    <ul className="space-y-1">
                      {match.squads
                        .filter((s) => s.teamId === myTeam.id)
                        .map((squad) => (
                          <li key={squad.id} className="text-sm">
                            {squad.position}. {squad.player.name}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Kadro belirlenmedi</p>
                  )}
                </div>

                <div className="flex gap-2">
                  {match.status === MatchStatus.SCHEDULED && (
                    <>
                      <button
                        onClick={() => handleSetSquad(match.id, myTeam.id)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Kadro Belirle
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMatch(match)
                          setShowScoreForm(true)
                          setHomeScore(match.homeScore?.toString() || "")
                          setAwayScore(match.awayScore?.toString() || "")
                        }}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Skor Gir
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {matches.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">Henüz maçınız yok</p>
            </div>
          )}
        </div>

        {showScoreForm && selectedMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">Maç Sonucu Gir</h2>
              <form onSubmit={handleSubmitScore} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {selectedMatch.homeTeam.name} Skoru
                  </label>
                  <input
                    type="number"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {selectedMatch.awayTeam.name} Skoru
                  </label>
                  <input
                    type="number"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                    min="0"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowScoreForm(false)
                      setSelectedMatch(null)
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

