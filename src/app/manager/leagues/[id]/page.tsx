"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Navbar from "@/components/Navbar"
import Link from "next/link"
import { MatchStatus, MatchType, LeagueFormat, ScoreStatus, LeagueStatus } from "@prisma/client"
import { formatTennisScore, type SetScore } from "@/lib/tennis-scoring"
import LeagueDeleteConfirm from "@/components/LeagueDeleteConfirm"

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
  const [activeTab, setActiveTab] = useState<"standings" | "matches" | "players" | "settings">("standings")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingLeague, setDeletingLeague] = useState(false)
  const [editingMatchDate, setEditingMatchDate] = useState<string | null>(null)
  const [newMatchDate, setNewMatchDate] = useState<string>("")

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

  const handleStartLeague = async () => {
    if (!confirm("Ligi başlatmak istediğinize emin misiniz?")) return

    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "startLeague" }),
      })

      if (res.ok) {
        await fetchLeague()
        alert("Lig başlatıldı")
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error starting league:", error)
      alert("Hata oluştu")
    }
  }

  const handleDeleteLeague = async () => {
    try {
      setDeletingLeague(true)
      const matchesCount = matches.length
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      })

      if (res.ok) {
        window.location.href = "/manager"
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error deleting league:", error)
      alert("Hata oluştu")
    } finally {
      setDeletingLeague(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleUpdateMatchDate = async (matchId: string) => {
    if (!newMatchDate) {
      alert("Lütfen bir tarih seçin")
      return
    }

    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: newMatchDate }),
      })

      if (res.ok) {
        await fetchMatches()
        setEditingMatchDate(null)
        setNewMatchDate("")
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error updating match date:", error)
      alert("Hata oluştu")
    }
  }

  const filteredMatches = matches.filter((match) => {
    if (filter === "ALL") return true
    return match.status === filter
  })

  const playerCount = leaguePlayers.length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{league.name}</h1>
            <p className="text-gray-600">{league.season}</p>
            <div className="flex gap-4 mt-2">
              <p className="text-sm text-gray-500">
                Format: {league.format === LeagueFormat.DOUBLES ? "Çiftler Ligi" : "Bireysel Lig"}
              </p>
              {league.format === LeagueFormat.INDIVIDUAL && (
                <p className="text-sm text-gray-500">
                  Oyuncu Sayısı: <span className="font-semibold">{playerCount}</span>
                </p>
              )}
              <p className="text-sm text-gray-500">
                Durum: <span className={`font-semibold ${
                  league.status === LeagueStatus.ACTIVE ? "text-green-600" :
                  league.status === LeagueStatus.COMPLETED ? "text-blue-600" :
                  "text-gray-600"
                }`}>
                  {league.status === LeagueStatus.DRAFT ? "Taslak" :
                   league.status === LeagueStatus.ACTIVE ? "Aktif" :
                   league.status === LeagueStatus.COMPLETED ? "Tamamlandı" :
                   "İptal"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowExcelUpload(!showExcelUpload)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              {showExcelUpload ? "İptal" : "📊 Excel ile Yükle"}
            </button>
            <Link
              href="/manager"
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
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

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("standings")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "standings"
                  ? "text-tennis-green border-b-2 border-tennis-green"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Puan Tablosu
            </button>
            <button
              onClick={() => setActiveTab("matches")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "matches"
                  ? "text-tennis-green border-b-2 border-tennis-green"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Maçlar
            </button>
            {league.format === LeagueFormat.INDIVIDUAL && (
              <button
                onClick={() => setActiveTab("players")}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "players"
                    ? "text-tennis-green border-b-2 border-tennis-green"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Oyuncular ({playerCount})
              </button>
            )}
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "settings"
                  ? "text-tennis-green border-b-2 border-tennis-green"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Ayarlar
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "standings" && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Lig Tablosu</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {league.format === LeagueFormat.DOUBLES ? "Takım" : "İsim"}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Maç Sayısı</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Galibiyet</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mağlubiyet</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Kazandığı Set</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Kaybettiği Set</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Kazandığı Oyun</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Kaybettiği Oyun</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Set Averajı</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Oyun Averajı</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.map((entry, index) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{entry.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">{entry.played}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-green-600 font-semibold">{entry.won}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-red-600 font-semibold">{entry.lost}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">{entry.setsWon}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">{entry.setsLost}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">{entry.gamesWon}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">{entry.gamesLost}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold">{entry.setAverage.toFixed(2)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold">{entry.gameAverage.toFixed(2)}</td>
                    </tr>
                  ))}
                  {table.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-3 text-center text-sm text-gray-500">
                        {league.format === LeagueFormat.DOUBLES ? "Henüz takım yok" : "Henüz oyuncu yok"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "matches" && (
          <div className="space-y-6">
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === "ALL" ? "bg-tennis-green text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setFilter(MatchStatus.SCHEDULED)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === MatchStatus.SCHEDULED ? "bg-tennis-green text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Planlanan
              </button>
              <button
                onClick={() => setFilter(MatchStatus.PLAYED)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === MatchStatus.PLAYED ? "bg-tennis-green text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Oynanan
              </button>
            </div>

            {/* Matches Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMatches.map((match) => {
                if (league.format === LeagueFormat.DOUBLES && (!match.homeTeam || !match.awayTeam)) return null
                if (league.format === LeagueFormat.INDIVIDUAL && (!match.homePlayer || !match.awayPlayer)) return null

                const homeName = league.format === LeagueFormat.INDIVIDUAL
                  ? match.homePlayer?.name || "Bilinmeyen"
                  : match.homeTeam?.name || "Bilinmeyen"
                const awayName = league.format === LeagueFormat.INDIVIDUAL
                  ? match.awayPlayer?.name || "Bilinmeyen"
                  : match.awayTeam?.name || "Bilinmeyen"

                return (
                  <div key={match.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                    <div className="mb-3">
                      <p className="font-semibold text-gray-900 mb-1">
                        {homeName} vs {awayName}
                      </p>
                      {(match.scoreStatus === ScoreStatus.APPROVED ||
                        match.scoreStatus === ScoreStatus.MANAGER_ENTERED) &&
                        match.setsWonHome !== null &&
                        match.setsWonAway !== null && (
                          <p className="text-lg font-bold text-tennis-green">
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
                          <p className="text-sm text-orange-600 font-medium">Onay Bekliyor</p>
                        )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Durum:</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
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

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Tarih:</span>
                        {editingMatchDate === match.id ? (
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={newMatchDate}
                              onChange={(e) => setNewMatchDate(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            <button
                              onClick={() => handleUpdateMatchDate(match.id)}
                              className="px-2 py-1 bg-tennis-green text-white rounded text-xs hover:bg-tennis-green/90"
                            >
                              Kaydet
                            </button>
                            <button
                              onClick={() => {
                                setEditingMatchDate(null)
                                setNewMatchDate("")
                              }}
                              className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                            >
                              İptal
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700">
                              {match.scheduledDate
                                ? new Date(match.scheduledDate).toLocaleDateString("tr-TR")
                                : "Belirlenmedi"}
                            </span>
                            <button
                              onClick={() => {
                                setEditingMatchDate(match.id)
                                setNewMatchDate(
                                  match.scheduledDate
                                    ? new Date(match.scheduledDate).toISOString().split("T")[0]
                                    : ""
                                )
                              }}
                              className="text-tennis-green hover:text-tennis-green/80 text-xs"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredMatches.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 text-lg">Henüz maç yok</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "players" && league.format === LeagueFormat.INDIVIDUAL && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Lig Oyuncuları ({playerCount})</h2>
            </div>
            <div className="mb-6">
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
                      className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-tennis-green focus:border-transparent"
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
                    className="px-4 py-2 bg-tennis-green text-white rounded-lg hover:bg-tennis-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Ekle ({selectedPlayersForAdd.length})
                  </button>
                </div>

                {selectedPlayersForAdd.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedPlayersForAdd.map((playerId) => {
                      const player = allPlayers.find((p) => p.id === playerId)
                      if (!player) return null
                      return (
                        <span
                          key={playerId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-tennis-green/10 text-tennis-green rounded-lg text-sm"
                        >
                          {player.name}
                          <button
                            onClick={() => togglePlayerSelection(playerId)}
                            className="text-tennis-green hover:text-tennis-green/80"
                          >
                            ✕
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}

                {dropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
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
                              isSelected ? "bg-tennis-green/10" : ""
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
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {leaguePlayers.length > 0 ? (
                leaguePlayers.map((lp: any) => (
                  <div
                    key={lp.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm font-medium">
                      {lp.player.name} <span className="text-gray-500">({lp.player.level || "Seviye yok"})</span>
                    </span>
                    <button
                      onClick={() => handleRemovePlayerFromLeague(lp.player.id)}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Çıkar
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500">Henüz oyuncu yok</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-2xl font-semibold">Lig Ayarları</h2>

            {/* League Start */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-2">Lig Başlatma</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ligi başlatarak aktif hale getirebilirsiniz. Sadece taslak durumundaki ligler başlatılabilir.
              </p>
              <button
                onClick={handleStartLeague}
                disabled={league.status !== LeagueStatus.DRAFT}
                className="px-4 py-2 bg-tennis-green text-white rounded-lg hover:bg-tennis-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {league.status === LeagueStatus.DRAFT ? "Ligi Başlat" : "Lig zaten başlatılmış"}
              </button>
            </div>

            {/* League Delete */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h3 className="text-lg font-medium mb-2 text-red-800">Tehlikeli Bölge</h3>
              <p className="text-sm text-red-700 mb-4">
                Ligi silmek tüm maçları, oyuncuları ve verileri kalıcı olarak silecektir. Bu işlem geri alınamaz.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Ligi Sil
              </button>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <LeagueDeleteConfirm
            leagueName={league.name}
            matchesCount={matches.length}
            onConfirm={handleDeleteLeague}
            onCancel={() => setShowDeleteConfirm(false)}
            isDeleting={deletingLeague}
          />
        )}
      </div>
    </div>
  )
}
