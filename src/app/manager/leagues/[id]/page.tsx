"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Navbar from "@/components/Navbar"
import Link from "next/link"
import { MatchStatus, MatchType, LeagueFormat } from "@prisma/client"

interface Match {
  id: string
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
  approvedBy: {
    id: string
    name: string
  } | null
  league?: {
    format: LeagueFormat
  }
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
  const [showExcelUpload, setShowExcelUpload] = useState(false)
  const [uploadingExcel, setUploadingExcel] = useState(false)
  const [leaguePlayers, setLeaguePlayers] = useState<any[]>([])
  const [allPlayers, setAllPlayers] = useState<any[]>([])

  const fetchLeague = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}`)
      const data = await res.json()
      setLeague(data)
      if (data.leaguePlayers) {
        setLeaguePlayers(data.leaguePlayers)
      }
    } catch (error) {
      console.error("Error fetching league:", error)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  const fetchAllPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?status=APPROVED")
      const data = await res.json()
      setAllPlayers(data)
    } catch (error) {
      console.error("Error fetching players:", error)
    }
  }, [])

  const fetchLeaguePlayers = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/players`)
      const data = await res.json()
      setLeaguePlayers(data)
    } catch (error) {
      console.error("Error fetching league players:", error)
    }
  }, [leagueId])

  const fetchMatches = useCallback(async () => {
    try {
      const statusParam = filter === "ALL" ? "" : `&status=${filter}`
      const res = await fetch(`/api/matches?leagueId=${leagueId}${statusParam}`)
      const data = await res.json()
      setMatches(data)
    } catch (error) {
      console.error("Error fetching matches:", error)
    }
  }, [leagueId, filter])

  const calculateTable = useCallback(() => {
    if (!league) return

    // Only calculate table for doubles leagues (team-based)
    if (league.format === LeagueFormat.INDIVIDUAL) {
      setTable([])
      return
    }

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
      .filter((m) => m.status === MatchStatus.PLAYED && m.homeScore !== null && m.awayScore !== null && m.homeTeam && m.awayTeam)
      .forEach((match) => {
        const homeEntry = tableMap.get(match.homeTeam!.id)
        const awayEntry = tableMap.get(match.awayTeam!.id)

        if (!homeEntry || !awayEntry) return

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
  }, [league, matches])

  useEffect(() => {
    if (session?.user && leagueId) {
      fetchLeague()
      fetchMatches()
      fetchAllPlayers()
    }
  }, [session, leagueId, filter, fetchLeague, fetchMatches, fetchAllPlayers])

  useEffect(() => {
    if (matches.length > 0 && league) {
      calculateTable()
    }
  }, [matches, league, calculateTable])

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

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`/api/manager/leagues/${leagueId}/download-template`)
      if (!res.ok) {
        throw new Error("Template indirme başarısız")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = league?.format === LeagueFormat.DOUBLES ? "takim-template.xlsx" : "oyuncu-template.xlsx"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading template:", error)
      alert("Template indirme sırasında bir hata oluştu")
    }
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingExcel(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const endpoint = league?.format === LeagueFormat.DOUBLES 
        ? `/api/manager/leagues/${leagueId}/upload-teams`
        : `/api/manager/leagues/${leagueId}/upload-players`

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        let message = `Başarıyla yüklendi!\nEklenen: ${data.created}`
        if (data.errors && data.errors.length > 0) {
          message += `\nHatalı satır sayısı: ${data.errors.length}`
          if (data.errors.length <= 10) {
            message += `\n\nHatalar:\n${data.errors.join("\n")}`
          } else {
            message += `\n\nİlk 10 hata:\n${data.errors.slice(0, 10).join("\n")}\n... ve ${data.errors.length - 10} hata daha`
            console.error("Tüm hatalar:", data.errors)
          }
        }
        alert(message)
        setShowExcelUpload(false)
        await fetchLeague()
        if (league?.format === LeagueFormat.INDIVIDUAL) {
          await fetchLeaguePlayers()
        }
      } else {
        alert(data.error || "Yükleme başarısız")
      }
    } catch (error) {
      console.error("Error uploading Excel:", error)
      alert("Yükleme sırasında bir hata oluştu")
    } finally {
      setUploadingExcel(false)
      e.target.value = ""
    }
  }

  const handleAddPlayerToLeague = async (playerId: string) => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      })
      if (res.ok) {
        await fetchLeaguePlayers()
        await fetchLeague()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error adding player:", error)
      alert("Hata oluştu")
    }
  }

  const handleRemovePlayerFromLeague = async (playerId: string) => {
    if (!confirm("Oyuncuyu ligden çıkarmak istediğinize emin misiniz?")) return

    try {
      const res = await fetch(`/api/leagues/${leagueId}/players?playerId=${playerId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        await fetchLeaguePlayers()
        await fetchLeague()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error removing player:", error)
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

  const pendingMatches = matches.filter(
    (m) =>
      m.status === MatchStatus.SCHEDULED &&
      m.homeScore !== null &&
      m.awayScore !== null &&
      ((league.format === LeagueFormat.DOUBLES && m.homeTeam && m.awayTeam) ||
        (league.format === LeagueFormat.INDIVIDUAL && m.homePlayer && m.awayPlayer))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{league.name}</h1>
            <p className="text-gray-600">{league.season}</p>
            <p className="text-sm text-gray-500">
              Format: {league.format === LeagueFormat.DOUBLES ? "Çiftler Ligi" : "Bireysel Lig"}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowExcelUpload(!showExcelUpload)}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              {showExcelUpload ? "İptal" : "📊 Excel ile Yükle"}
            </button>
            <Link
              href="/manager"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Geri
            </Link>
          </div>
        </div>

        {showExcelUpload && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Excel ile {league.format === LeagueFormat.DOUBLES ? "Takım" : "Oyuncu"} Yükle
            </h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {league.format === LeagueFormat.DOUBLES 
                  ? "Excel dosyası formatı: Takım Adı, Kategori, Maksimum Oyuncu"
                  : "Excel dosyası formatı: Email veya Oyuncu"}
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm mb-3"
              >
                📥 Template İndir
              </button>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelUpload}
              disabled={uploadingExcel}
              className="mb-4"
            />
            {uploadingExcel && <p className="text-blue-600">Yükleniyor...</p>}
          </div>
        )}

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
              {pendingMatches.map((match) => {
                const isIndividual = league.format === LeagueFormat.INDIVIDUAL
                const homeName = isIndividual
                  ? match.homePlayer?.name || "Bilinmeyen"
                  : match.homeTeam?.name || "Bilinmeyen"
                const awayName = isIndividual
                  ? match.awayPlayer?.name || "Bilinmeyen"
                  : match.awayTeam?.name || "Bilinmeyen"

                return (
                  <div key={match.id} className="flex items-center justify-between p-2 bg-white rounded">
                    <div>
                      <p className="font-medium">
                        {homeName} {match.homeScore} - {match.awayScore} {awayName}
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
                )
              })}
            </div>
          </div>
        )}

        {league.format === LeagueFormat.DOUBLES ? (
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
                    {table.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-3 text-center text-sm text-gray-500">
                          Henüz takım yok
                        </td>
                      </tr>
                    )}
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
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Lig Oyuncuları</h2>
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Oyuncu Ekle</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddPlayerToLeague(e.target.value)
                        e.target.value = ""
                      }
                    }}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Oyuncu Seç</option>
                    {allPlayers
                      .filter((player) => {
                        // Filter players based on league category
                        if (league.category === "MALE" && player.gender !== "MALE") {
                          return false
                        }
                        if (league.category === "FEMALE" && player.gender !== "FEMALE") {
                          return false
                        }
                        // Check if player is already in league
                        return !leaguePlayers.some((lp: any) => lp.player.id === player.id)
                      })
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name} ({player.level || "Seviye yok"})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  {leaguePlayers.length > 0 ? (
                    leaguePlayers.map((lp: any) => (
                      <div
                        key={lp.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm">
                          {lp.player.name} ({lp.player.level || "Seviye yok"})
                        </span>
                        <button
                          onClick={() => handleRemovePlayerFromLeague(lp.player.id)}
                          className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        >
                          Çıkar
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Henüz oyuncu yok</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Maçlar</h2>
              <div className="space-y-2">
                {matches.map((match) => {
                  const isIndividual = league.format === LeagueFormat.INDIVIDUAL
                  const homeName = isIndividual
                    ? match.homePlayer?.name || "Bilinmeyen"
                    : match.homeTeam?.name || "Bilinmeyen"
                  const awayName = isIndividual
                    ? match.awayPlayer?.name || "Bilinmeyen"
                    : match.awayTeam?.name || "Bilinmeyen"

                  return (
                    <div key={match.id} className="bg-white rounded-lg shadow p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium">
                            {homeName} vs {awayName}
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
                  )
                })}
                {matches.length === 0 && (
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <p className="text-gray-500">Henüz maç yok</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

