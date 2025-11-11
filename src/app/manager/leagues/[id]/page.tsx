"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Navbar from "@/components/Navbar"
import Link from "next/link"
import { MatchStatus, MatchType, LeagueFormat, ScoreStatus } from "@prisma/client"
import { formatTennisScore, type SetScore } from "@/lib/tennis-scoring"

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
  scoreStatus: ScoreStatus
  homeScore: number | null
  awayScore: number | null
  setsWonHome: number | null
  setsWonAway: number | null
  gamesWonHome: number | null
  gamesWonAway: number | null
  approvedBy: {
    id: string
    name: string
  } | null
  league?: {
    format: LeagueFormat
  }
}

interface LeagueTableEntry {
  id: string // teamId or playerId
  name: string // teamName or playerName
  played: number
  won: number
  lost: number
  setsWon: number
  setsLost: number
  gamesWon: number
  gamesLost: number
  setAverage: number
  gameAverage: number
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
  const [selectedPlayersForAdd, setSelectedPlayersForAdd] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)

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

    const tableMap = new Map<string, LeagueTableEntry>()

    // Initialize table entries
    if (league.format === LeagueFormat.DOUBLES) {
      // Team-based league
      league.teams.forEach((team: any) => {
        tableMap.set(team.id, {
          id: team.id,
          name: team.name,
          played: 0,
          won: 0,
          lost: 0,
          setsWon: 0,
          setsLost: 0,
          gamesWon: 0,
          gamesLost: 0,
          setAverage: 0,
          gameAverage: 0,
        })
      })
    } else {
      // Individual league
      league.leaguePlayers?.forEach((lp: any) => {
        tableMap.set(lp.playerId, {
          id: lp.playerId,
          name: lp.player.name,
          played: 0,
          won: 0,
          lost: 0,
          setsWon: 0,
          setsLost: 0,
          gamesWon: 0,
          gamesLost: 0,
          setAverage: 0,
          gameAverage: 0,
        })
      })
    }

    // Calculate stats from approved matches only
    const approvedMatches = matches.filter(
      (m) =>
        m.status === MatchStatus.PLAYED &&
        (m.scoreStatus === ScoreStatus.APPROVED || m.scoreStatus === ScoreStatus.MANAGER_ENTERED) &&
        m.setsWonHome !== null &&
        m.setsWonAway !== null
    )

    approvedMatches.forEach((match) => {
      if (league.format === LeagueFormat.DOUBLES) {
        // Team-based match
        if (!match.homeTeam || !match.awayTeam) return

        const homeEntry = tableMap.get(match.homeTeam.id)
        const awayEntry = tableMap.get(match.awayTeam.id)

        if (!homeEntry || !awayEntry) return

        homeEntry.played++
        awayEntry.played++
        homeEntry.setsWon += match.setsWonHome!
        homeEntry.setsLost += match.setsWonAway!
        awayEntry.setsWon += match.setsWonAway!
        awayEntry.setsLost += match.setsWonHome!

        homeEntry.gamesWon += match.gamesWonHome || 0
        homeEntry.gamesLost += match.gamesWonAway || 0
        awayEntry.gamesWon += match.gamesWonAway || 0
        awayEntry.gamesLost += match.gamesWonHome || 0

        if (match.setsWonHome! > match.setsWonAway!) {
          homeEntry.won++
          awayEntry.lost++
        } else {
          awayEntry.won++
          homeEntry.lost++
        }
      } else {
        // Individual match
        if (!match.homePlayer || !match.awayPlayer) return

        const homeEntry = tableMap.get(match.homePlayer.id)
        const awayEntry = tableMap.get(match.awayPlayer.id)

        if (!homeEntry || !awayEntry) return

        homeEntry.played++
        awayEntry.played++
        homeEntry.setsWon += match.setsWonHome!
        homeEntry.setsLost += match.setsWonAway!
        awayEntry.setsWon += match.setsWonAway!
        awayEntry.setsLost += match.setsWonHome!

        homeEntry.gamesWon += match.gamesWonHome || 0
        homeEntry.gamesLost += match.gamesWonAway || 0
        awayEntry.gamesWon += match.gamesWonAway || 0
        awayEntry.gamesLost += match.gamesWonHome || 0

        if (match.setsWonHome! > match.setsWonAway!) {
          homeEntry.won++
          awayEntry.lost++
        } else {
          awayEntry.won++
          homeEntry.lost++
        }
      }
    })

    // Calculate averages
    tableMap.forEach((entry) => {
      entry.setAverage = entry.setsLost > 0 ? entry.setsWon / entry.setsLost : entry.setsWon
      entry.gameAverage = entry.gamesLost > 0 ? entry.gamesWon / entry.gamesLost : entry.gamesWon
    })

    // Sort by: Wins (desc), Set Average (desc), Game Average (desc)
    const sortedTable = Array.from(tableMap.values()).sort((a, b) => {
      if (b.won !== a.won) return b.won - a.won
      if (b.setAverage !== a.setAverage) return b.setAverage - a.setAverage
      return b.gameAverage - a.gameAverage
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleAddSelectedPlayers = async () => {
    if (selectedPlayersForAdd.length === 0) {
      alert("Lütfen en az bir oyuncu seçin")
      return
    }

    try {
      const res = await fetch(`/api/leagues/${leagueId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: selectedPlayersForAdd }),
      })
      
      const data = await res.json()
      if (res.ok) {
        let message = `${data.created || selectedPlayersForAdd.length} oyuncu eklendi`
        if (data.errors && data.errors.length > 0) {
          message += `\nHatalar: ${data.errors.length}`
          if (data.errors.length <= 5) {
            message += `\n${data.errors.join("\n")}`
          }
        }
        alert(message)
        // Clear selections and search
        setSelectedPlayersForAdd([])
        setSearchQuery("")
        setDropdownOpen(false)
        await fetchLeaguePlayers()
        await fetchLeague()
      } else {
        alert(data.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error adding players:", error)
      alert("Hata oluştu")
    }
  }

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayersForAdd(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId)
      } else {
        return [...prev, playerId]
      }
    })
  }

  const getAvailablePlayers = () => {
    if (!league) return []
    return allPlayers.filter((player) => {
      // Filter players based on league category
      if (league.category === "MALE" && player.gender !== "MALE") {
        return false
      }
      if (league.category === "FEMALE" && player.gender !== "FEMALE") {
        return false
      }
      // Check if player is already in league
      if (leaguePlayers.some((lp: any) => lp.player.id === player.id)) {
        return false
      }
      // Filter by search query
      const query = searchQuery.toLowerCase()
      if (query && !player.name.toLowerCase().includes(query)) {
        return false
      }
      return true
    })
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
                        {league?.format === LeagueFormat.DOUBLES ? "Takım" : "İsim"}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Maç Sayısı
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Galibiyet
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Mağlubiyet
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Kazandığı Set
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Kaybettiği Set
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Kazandığı Oyun
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Kaybettiği Oyun
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Set Averajı
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Oyun Averajı
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {table.map((entry, index) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          {entry.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {entry.played}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-green-600 font-semibold">
                          {entry.won}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-red-600 font-semibold">
                          {entry.lost}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {entry.setsWon}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {entry.setsLost}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {entry.gamesWon}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {entry.gamesLost}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold">
                          {entry.setAverage.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold">
                          {entry.gameAverage.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {table.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-4 py-3 text-center text-sm text-gray-500">
                          {league?.format === LeagueFormat.DOUBLES ? "Henüz takım yok" : "Henüz oyuncu yok"}
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
              {matches.map((match) => {
                // Show matches based on league format
                if (league.format === LeagueFormat.DOUBLES && (!match.homeTeam || !match.awayTeam)) return null
                if (league.format === LeagueFormat.INDIVIDUAL && (!match.homePlayer || !match.awayPlayer)) return null

                return (
                  <div key={match.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium">
                          {match.homePlayer?.name || match.homeTeam?.name || "Bilinmeyen"} vs{" "}
                          {match.awayPlayer?.name || match.awayTeam?.name || "Bilinmeyen"}
                        </p>
                      {(match.scoreStatus === ScoreStatus.APPROVED ||
                        match.scoreStatus === ScoreStatus.MANAGER_ENTERED) &&
                        match.setsWonHome !== null &&
                        match.setsWonAway !== null && (
                          <p className="text-lg font-semibold">
                            {match.setsWonHome} - {match.setsWonAway} Set
                            {match.gamesWonHome !== null && match.gamesWonAway !== null && (
                              <span className="text-sm text-gray-600 ml-2">
                                ({match.gamesWonHome} - {match.gamesWonAway} Oyun)
                              </span>
                            )}
                          </p>
                        )}
                      {match.scoreStatus &&
                        match.scoreStatus !== ScoreStatus.APPROVED &&
                        match.scoreStatus !== ScoreStatus.MANAGER_ENTERED &&
                        match.scoreStatus !== ScoreStatus.PENDING && (
                          <p className="text-sm text-orange-600">Onay Bekliyor</p>
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
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Lig Oyuncuları</h2>
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Oyuncu Ekle</label>
                  <div className="relative dropdown-container">
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Oyuncu ara..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setDropdownOpen(true)
                          }}
                          onFocus={() => setDropdownOpen(true)}
                          className="w-full border rounded px-3 py-2 pr-10"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchQuery("")
                              setDropdownOpen(false)
                            }}
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <button
                        onClick={handleAddSelectedPlayers}
                        disabled={selectedPlayersForAdd.length === 0}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Ekle ({selectedPlayersForAdd.length})
                      </button>
                    </div>

                    {/* Selected players chips */}
                    {selectedPlayersForAdd.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedPlayersForAdd.map((playerId) => {
                          const player = allPlayers.find(p => p.id === playerId)
                          if (!player) return null
                          return (
                            <span
                              key={playerId}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                            >
                              {player.name}
                              <button
                                onClick={() => togglePlayerSelection(playerId)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                ✕
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {/* Dropdown */}
                    {dropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                        {getAvailablePlayers().length === 0 ? (
                          <div className="p-3 text-gray-500 text-sm">Oyuncu bulunamadı</div>
                        ) : (
                          getAvailablePlayers().map((player) => {
                            const isSelected = selectedPlayersForAdd.includes(player.id)
                            return (
                              <div
                                key={player.id}
                                onClick={() => togglePlayerSelection(player.id)}
                                className={`p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between ${
                                  isSelected ? "bg-blue-50" : ""
                                }`}
                              >
                                <span className="text-sm">
                                  {player.name} ({player.level || "Seviye yok"})
                                </span>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  onClick={(e) => e.stopPropagation()}
                                  className="ml-2"
                                />
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
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

