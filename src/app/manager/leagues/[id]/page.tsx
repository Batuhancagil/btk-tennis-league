"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Navbar from "@/components/Navbar"
import Link from "next/link"
import { MatchStatus, MatchType } from "@prisma/client"

interface Match {
  id: string
  homeTeam: {
    id: string
    name: string
  }
  awayTeam: {
    id: string
    name: string
  }
  matchType: MatchType
  scheduledDate: string | null
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  approvedBy: {
    id: string
    name: string
  } | null
}

interface LeagueTableEntry {
  teamId: string
  teamName: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export default function LeagueDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const leagueId = params.id as string
  const [league, setLeague] = useState<any>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [table, setTable] = useState<LeagueTableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<MatchStatus | "ALL">("ALL")

  useEffect(() => {
    if (session?.user && leagueId) {
      fetchLeague()
      fetchMatches()
    }
  }, [session, leagueId, filter])

  useEffect(() => {
    if (matches.length > 0) {
      calculateTable()
    }
  }, [matches])

  const fetchLeague = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}`)
      const data = await res.json()
      setLeague(data)
    } catch (error) {
      console.error("Error fetching league:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMatches = async () => {
    try {
      const statusParam = filter === "ALL" ? "" : `?status=${filter}`
      const res = await fetch(`/api/matches?leagueId=${leagueId}${statusParam}`)
      const data = await res.json()
      setMatches(data)
    } catch (error) {
      console.error("Error fetching matches:", error)
    }
  }

  const calculateTable = () => {
    if (!league) return

    const tableMap = new Map<string, LeagueTableEntry>()

    // Initialize table entries for all teams
    league.teams.forEach((team: any) => {
      tableMap.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      })
    })

    // Calculate stats from played matches
    matches
      .filter((m) => m.status === MatchStatus.PLAYED && m.homeScore !== null && m.awayScore !== null)
      .forEach((match) => {
        const homeEntry = tableMap.get(match.homeTeam.id)!
        const awayEntry = tableMap.get(match.awayTeam.id)!

        homeEntry.played++
        awayEntry.played++
        homeEntry.goalsFor += match.homeScore!
        homeEntry.goalsAgainst += match.awayScore!
        awayEntry.goalsFor += match.awayScore!
        awayEntry.goalsAgainst += match.homeScore!

        if (match.homeScore! > match.awayScore!) {
          homeEntry.won++
          homeEntry.points += 3
          awayEntry.lost++
        } else if (match.homeScore! < match.awayScore!) {
          awayEntry.won++
          awayEntry.points += 3
          homeEntry.lost++
        } else {
          homeEntry.drawn++
          awayEntry.drawn++
          homeEntry.points += 1
          awayEntry.points += 1
        }
      })

    // Calculate goal difference
    tableMap.forEach((entry) => {
      entry.goalDifference = entry.goalsFor - entry.goalsAgainst
    })

    // Sort by points, then goal difference, then goals for
    const sortedTable = Array.from(tableMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
      return b.goalsFor - a.goalsFor
    })

    setTable(sortedTable)
  }

  const handleApproveMatch = async (matchId: string) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/approve`, {
        method: "POST",
      })
      if (res.ok) {
        fetchMatches()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error approving match:", error)
      alert("Hata oluştu")
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

  if (!league) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">Lig bulunamadı</div>
      </div>
    )
  }

  const pendingMatches = matches.filter((m) => m.status === MatchStatus.SCHEDULED && m.homeScore !== null && m.awayScore !== null)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{league.name}</h1>
            <p className="text-gray-600">{league.season}</p>
          </div>
          <Link
            href="/manager"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Geri
          </Link>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-2 rounded ${
              filter === "ALL" ? "bg-blue-500 text-white" : "bg-white"
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilter(MatchStatus.SCHEDULED)}
            className={`px-4 py-2 rounded ${
              filter === MatchStatus.SCHEDULED ? "bg-blue-500 text-white" : "bg-white"
            }`}
          >
            Planlanan
          </button>
          <button
            onClick={() => setFilter(MatchStatus.PLAYED)}
            className={`px-4 py-2 rounded ${
              filter === MatchStatus.PLAYED ? "bg-blue-500 text-white" : "bg-white"
            }`}
          >
            Oynanan
          </button>
        </div>

        {pendingMatches.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2">Onay Bekleyen Maçlar ({pendingMatches.length})</h2>
            <div className="space-y-2">
              {pendingMatches.map((match) => (
                <div key={match.id} className="flex items-center justify-between p-2 bg-white rounded">
                  <div>
                    <p className="font-medium">
                      {match.homeTeam.name} {match.homeScore} - {match.awayScore} {match.awayTeam.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {match.scheduledDate
                        ? new Date(match.scheduledDate).toLocaleDateString("tr-TR")
                        : "Tarih belirlenmedi"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleApproveMatch(match.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Onayla
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Lig Tablosu</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Takım
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      O
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      G
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      B
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      M
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      A
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      P
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.map((entry, index) => (
                    <tr key={entry.teamId}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {entry.teamName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {entry.played}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {entry.won}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {entry.drawn}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {entry.lost}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {entry.goalsFor}:{entry.goalsAgainst}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-center">
                        {entry.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Maçlar</h2>
            <div className="space-y-2">
              {matches.map((match) => (
                <div key={match.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium">
                        {match.homeTeam.name} vs {match.awayTeam.name}
                      </p>
                      {match.status === MatchStatus.PLAYED && match.homeScore !== null && match.awayScore !== null && (
                        <p className="text-lg font-semibold">
                          {match.homeScore} - {match.awayScore}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        {match.matchType === MatchType.SINGLE ? "Single" : "Double"}
                      </p>
                      {match.scheduledDate && (
                        <p className="text-sm text-gray-500">
                          {new Date(match.scheduledDate).toLocaleDateString("tr-TR")}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
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
                  {match.approvedBy && (
                    <p className="text-xs text-gray-500">
                      Onaylayan: {match.approvedBy.name}
                    </p>
                  )}
                </div>
              ))}
              {matches.length === 0 && (
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <p className="text-gray-500">Henüz maç yok</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

