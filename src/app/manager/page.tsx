"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { LeagueType, LeagueStatus, TeamCategory, MatchType, LeagueFormat } from "@prisma/client"
import Link from "next/link"

interface League {
  id: string
  name: string
  type: LeagueType
  format: LeagueFormat
  category: TeamCategory
  season: string
  status: LeagueStatus
  teams: Array<{
    id: string
    name: string
    captain: {
      id: string
      name: string
    }
  }>
  leaguePlayers?: Array<{
    playerId: string
  }>
  _count: {
    matches: number
    leaguePlayers: number
  }
}

interface Team {
  id: string
  name: string
  category: TeamCategory
  captain: {
    id: string
    name: string
  }
  players: Array<{
    player: {
      id: string
      name: string
      gender: string
      level: string
    }
  }>
}

export default function ManagerDashboard() {
  const { data: session } = useSession()
  const [leagues, setLeagues] = useState<League[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateLeague, setShowCreateLeague] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState("")
  const [newLeagueType, setNewLeagueType] = useState<LeagueType>(LeagueType.INTRA_TEAM)
  const [newLeagueFormat, setNewLeagueFormat] = useState<LeagueFormat>(LeagueFormat.DOUBLES)
  const [newLeagueCategory, setNewLeagueCategory] = useState<TeamCategory>(TeamCategory.MALE)
  const [newLeagueSeason, setNewLeagueSeason] = useState("")
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editTeamName, setEditTeamName] = useState("")
  const [editTeamCategory, setEditTeamCategory] = useState<TeamCategory>(TeamCategory.MALE)
  const [editTeamMaxPlayers, setEditTeamMaxPlayers] = useState<number | null>(null)
  const [teamPlayers, setTeamPlayers] = useState<any[]>([])
  const [allPlayers, setAllPlayers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [selectedLeagues, setSelectedLeagues] = useState<Set<string>>(new Set())
  const [showExcelUpload, setShowExcelUpload] = useState(false)
  const [uploadingExcel, setUploadingExcel] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchLeagues()
      fetchTeams()
      fetchAllPlayers()
    }
  }, [session])

  const fetchLeagues = async () => {
    try {
      const res = await fetch("/api/leagues")
      const data = await res.json()
      setLeagues(data)
    } catch (error) {
      console.error("Error fetching leagues:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams")
      const data = await res.json()
      setTeams(data)
    } catch (error) {
      console.error("Error fetching teams:", error)
    }
  }

  const fetchAllPlayers = async () => {
    try {
      const res = await fetch("/api/users?status=APPROVED")
      const data = await res.json()
      setAllPlayers(data)
    } catch (error) {
      console.error("Error fetching players:", error)
    }
  }

  const handleEditTeam = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}`)
      const data = await res.json()
      setEditingTeam(data)
      setEditTeamName(data.name)
      setEditTeamCategory(data.category)
      setEditTeamMaxPlayers(data.maxPlayers || null)
      setTeamPlayers(data.players || [])
    } catch (error) {
      console.error("Error fetching team:", error)
      alert("Takım bilgileri yüklenirken hata oluştu")
    }
  }

  const handleSaveTeam = async () => {
    if (!editingTeam) return

    setSaving(true)
    try {
      const res = await fetch(`/api/teams/${editingTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editTeamName,
          category: editTeamCategory,
          maxPlayers: editTeamMaxPlayers,
        }),
      })
      if (res.ok) {
        setEditingTeam(null)
        fetchLeagues()
        fetchTeams()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error updating team:", error)
      alert("Hata oluştu")
    } finally {
      setSaving(false)
    }
  }


  const handleAddPlayerToTeam = async (playerId: string) => {
    if (!editingTeam) return

    try {
      const res = await fetch(`/api/teams/${editingTeam.id}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      })
      if (res.ok) {
        handleEditTeam(editingTeam.id) // Refresh team data
        fetchLeagues()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error adding player:", error)
      alert("Hata oluştu")
    }
  }

  const handleRemovePlayerFromTeam = async (playerId: string) => {
    if (!editingTeam) return
    if (!confirm("Oyuncuyu takımdan çıkarmak istediğinize emin misiniz?")) return

    try {
      const res = await fetch(`/api/teams/${editingTeam.id}/players?playerId=${playerId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        handleEditTeam(editingTeam.id) // Refresh team data
        fetchLeagues()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error removing player:", error)
      alert("Hata oluştu")
    }
  }

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLeagueName,
          type: newLeagueType,
          format: newLeagueFormat,
          category: newLeagueCategory,
          season: newLeagueSeason,
        }),
      })
      if (res.ok) {
        setShowCreateLeague(false)
        setNewLeagueName("")
        setNewLeagueSeason("")
        setNewLeagueFormat(LeagueFormat.DOUBLES)
        fetchLeagues()
      }
    } catch (error) {
      console.error("Error creating league:", error)
    }
  }

  const handleAddTeam = async (leagueId: string, teamId: string) => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      })
      if (res.ok) {
        fetchLeagues()
        fetchTeams() // Refresh teams list
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error adding team:", error)
      alert("Hata oluştu")
    }
  }

  const handleRemoveTeam = async (leagueId: string, teamId: string) => {
    if (!confirm("Takımı ligden çıkarmak istediğinize emin misiniz?")) return

    try {
      const res = await fetch(`/api/leagues/${leagueId}/teams?teamId=${teamId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchLeagues()
      }
    } catch (error) {
      console.error("Error removing team:", error)
    }
  }

  const handleAddPlayerToLeague = async (leagueId: string, playerId: string) => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      })
      if (res.ok) {
        fetchLeagues()
      } else {
        const error = await res.json()
        alert(error.error || "Oyuncu eklenirken hata oluştu")
      }
    } catch (error) {
      console.error("Error adding player to league:", error)
      alert("Oyuncu eklenirken hata oluştu")
    }
  }

  const handleDeleteLeague = async (leagueId: string) => {
    if (!confirm("Bu ligi silmek istediğinize emin misiniz?")) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await fetchLeagues()
        setSelectedLeagues((prev) => {
          const newSet = new Set(prev)
          newSet.delete(leagueId)
          return newSet
        })
      } else {
        const error = await res.json()
        alert(error.error || "Lig silinirken hata oluştu")
      }
    } catch (error) {
      console.error("Error deleting league:", error)
      alert("Lig silinirken hata oluştu")
    } finally {
      setDeleting(false)
    }
  }

  const handleCompleteLeague = async (leagueId: string) => {
    if (!confirm("Bu ligi sonlandırmak istediğinize emin misiniz?")) return

    setCompleting(true)
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: LeagueStatus.COMPLETED }),
      })

      if (res.ok) {
        await fetchLeagues()
      } else {
        const error = await res.json()
        alert(error.error || "Lig sonlandırılırken hata oluştu")
      }
    } catch (error) {
      console.error("Error completing league:", error)
      alert("Lig sonlandırılırken hata oluştu")
    } finally {
      setCompleting(false)
    }
  }

  const handleSelectLeague = (leagueId: string) => {
    setSelectedLeagues((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(leagueId)) {
        newSet.delete(leagueId)
      } else {
        newSet.add(leagueId)
      }
      return newSet
    })
  }

  const handleSelectAllLeagues = () => {
    if (selectedLeagues.size === leagues.length) {
      setSelectedLeagues(new Set())
    } else {
      setSelectedLeagues(new Set(leagues.map((l) => l.id)))
    }
  }

  const handleBulkDeleteLeagues = async () => {
    if (selectedLeagues.size === 0) return

    const count = selectedLeagues.size
    if (!confirm(`${count} ligi silmek istediğinize emin misiniz?`)) return

    setDeleting(true)
    try {
      const res = await fetch("/api/leagues", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueIds: Array.from(selectedLeagues) }),
      })

      if (res.ok) {
        const result = await res.json()
        await fetchLeagues()
        setSelectedLeagues(new Set())
        
        if (result.failed && result.failed.length > 0) {
          const failedMessages = result.failed.map((f: any) => `${f.leagueId}: ${f.reason}`).join("\n")
          alert(`Bazı ligler silinemedi:\n${failedMessages}`)
        } else {
          alert(`${result.successful.length} lig başarıyla silindi`)
        }
      } else {
        const error = await res.json()
        alert(error.error || "Ligler silinirken hata oluştu")
      }
    } catch (error) {
      console.error("Error bulk deleting leagues:", error)
      alert("Ligler silinirken hata oluştu")
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkCompleteLeagues = async () => {
    if (selectedLeagues.size === 0) return

    const count = selectedLeagues.size
    if (!confirm(`${count} ligi sonlandırmak istediğinize emin misiniz?`)) return

    setCompleting(true)
    try {
      const res = await fetch("/api/leagues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueIds: Array.from(selectedLeagues), status: LeagueStatus.COMPLETED }),
      })

      if (res.ok) {
        const result = await res.json()
        await fetchLeagues()
        setSelectedLeagues(new Set())
        
        if (result.failed && result.failed.length > 0) {
          const failedMessages = result.failed.map((f: any) => `${f.leagueId}: ${f.reason}`).join("\n")
          alert(`Bazı ligler sonlandırılamadı:\n${failedMessages}`)
        } else {
          alert(`${result.successful.length} lig başarıyla sonlandırıldı`)
        }
      } else {
        const error = await res.json()
        alert(error.error || "Ligler sonlandırılırken hata oluştu")
      }
    } catch (error) {
      console.error("Error bulk completing leagues:", error)
      alert("Ligler sonlandırılırken hata oluştu")
    } finally {
      setCompleting(false)
    }
  }

  const handleGenerateFixtures = async (leagueId: string) => {
    const matchType = prompt("Maç tipi seçin (SINGLE veya DOUBLE):", "DOUBLE")
    if (!matchType || !["SINGLE", "DOUBLE"].includes(matchType)) {
      alert("Geçersiz maç tipi")
      return
    }

    const startDate = prompt("Başlangıç tarihi (YYYY-MM-DD):", new Date().toISOString().split("T")[0])
    if (!startDate) {
      alert("Geçersiz tarih")
      return
    }

    try {
      const res = await fetch(`/api/leagues/${leagueId}/fixtures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchType,
          startDate,
        }),
      })
      if (res.ok) {
        alert("Fikstür oluşturuldu")
        fetchLeagues()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error generating fixtures:", error)
      alert("Hata oluştu")
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/manager/download-template")
      if (!res.ok) {
        throw new Error("Template indirme başarısız")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "lig-template.xlsx"
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

      const res = await fetch("/api/manager/upload-leagues", {
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
        await fetchLeagues()
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tennis-gold mx-auto mb-4"></div>
              <div className="text-gray-600">Yükleniyor...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Lig Yöneticisi Paneli</h1>
            <p className="text-gray-600">Liglerinizi yönetin ve fikstür oluşturun</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {selectedLeagues.size > 0 && (
              <>
                <button
                  onClick={handleBulkDeleteLeagues}
                  disabled={deleting}
                  className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {deleting ? "Siliniyor..." : `Seçilenleri Sil (${selectedLeagues.size})`}
                </button>
                <button
                  onClick={handleBulkCompleteLeagues}
                  disabled={completing}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all disabled:opacity-50"
                >
                  {completing ? "Sonlandırılıyor..." : `Seçilenleri Sonlandır (${selectedLeagues.size})`}
                </button>
              </>
            )}
            <button
              onClick={() => setShowExcelUpload(!showExcelUpload)}
              className="px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-all"
            >
              {showExcelUpload ? "İptal" : "📊 Excel ile Yükle"}
            </button>
            <button
              onClick={() => setShowCreateLeague(true)}
              className="px-6 py-3 bg-tennis-gold text-tennis-black rounded-xl font-semibold hover:bg-tennis-gold/90 transition-all tennis-shadow-gold"
            >
              Yeni Lig Oluştur
            </button>
          </div>
        </div>

        {showExcelUpload && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">Excel ile Lig Yükle</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Excel dosyası formatı: <strong>Lig Adı</strong>, <strong>Lig Tipi</strong> (INTRA_TEAM/CLUB veya Takım İçi/Kulüp Ligi), <strong>Kategori</strong> (MALE/FEMALE/MIXED veya Erkek/Kadın/Mix), <strong>Sezon</strong>
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Not: Lig adı ve sezon zorunludur.
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

        {editingTeam && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Takımı Düzenle</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Takım Adı</label>
                  <input
                    type="text"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label>
                  <select
                    value={editTeamCategory}
                    onChange={(e) => setEditTeamCategory(e.target.value as TeamCategory)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all"
                  >
                    <option value={TeamCategory.MALE}>Erkek</option>
                    <option value={TeamCategory.FEMALE}>Kadın</option>
                    <option value={TeamCategory.MIXED}>Mix</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Maksimum Oyuncu Sayısı</label>
                  <input
                    type="number"
                    min="1"
                    value={editTeamMaxPlayers || ""}
                    onChange={(e) => setEditTeamMaxPlayers(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Sınırsız"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Takım Üyeleri</label>
                <div className="space-y-2 mb-4">
                  {teamPlayers.length > 0 ? (
                    teamPlayers.map((tp: any) => (
                      <div
                        key={tp.player.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm">
                          {tp.player.name} ({tp.player.level || "Seviye yok"})
                        </span>
                        {editingTeam.captain.id !== tp.player.id && (
                          <button
                            onClick={() => handleRemovePlayerFromTeam(tp.player.id)}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                          >
                            Çıkar
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Henüz üye yok</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Oyuncu Ekle</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddPlayerToTeam(e.target.value)
                        e.target.value = ""
                      }
                    }}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all"
                  >
                    <option value="">Oyuncu Seç</option>
                    {allPlayers
                      .filter((player) => {
                        // Filter players based on team category
                        if (editTeamCategory === TeamCategory.MALE && player.gender !== "MALE") {
                          return false
                        }
                        if (editTeamCategory === TeamCategory.FEMALE && player.gender !== "FEMALE") {
                          return false
                        }
                        // Check if player is already in team
                        return !teamPlayers.some((tp: any) => tp.player.id === player.id)
                      })
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name} ({player.level || "Seviye yok"})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSaveTeam}
                  disabled={saving}
                  className="px-6 py-3 bg-tennis-green text-white rounded-xl hover:bg-tennis-green/90 transition-colors font-semibold disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button
                  onClick={() => setEditingTeam(null)}
                  className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-semibold"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {showCreateLeague && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Yeni Lig Oluştur</h2>
            <form onSubmit={handleCreateLeague} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Lig Adı</label>
                <input
                  type="text"
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lig Tipi</label>
                  <select
                    value={newLeagueType}
                    onChange={(e) => setNewLeagueType(e.target.value as LeagueType)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all"
                  >
                    <option value={LeagueType.INTRA_TEAM}>Takım İçi</option>
                    <option value={LeagueType.CLUB}>Kulüp Ligi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Format</label>
                  <select
                    value={newLeagueFormat}
                    onChange={(e) => setNewLeagueFormat(e.target.value as LeagueFormat)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all"
                  >
                    <option value={LeagueFormat.DOUBLES}>Çiftler Ligi</option>
                    <option value={LeagueFormat.INDIVIDUAL}>Bireysel Lig</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label>
                <select
                  value={newLeagueCategory}
                  onChange={(e) => setNewLeagueCategory(e.target.value as TeamCategory)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all"
                >
                  <option value={TeamCategory.MALE}>Erkek</option>
                  <option value={TeamCategory.FEMALE}>Kadın</option>
                  <option value={TeamCategory.MIXED}>Mix</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sezon</label>
                <input
                  type="text"
                  value={newLeagueSeason}
                  onChange={(e) => setNewLeagueSeason(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all"
                  placeholder="2024-2025"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-3 bg-tennis-green text-white rounded-xl hover:bg-tennis-green/90 transition-colors font-semibold"
                >
                  Oluştur
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateLeague(false)}
                  className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-semibold"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {leagues.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedLeagues.size === leagues.length && leagues.length > 0}
              onChange={handleSelectAllLeagues}
              className="w-4 h-4"
            />
            <label className="text-sm text-gray-700">Tümünü Seç</label>
          </div>
        )}

        <div className="space-y-6">
          {leagues.map((league) => (
            <div key={league.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedLeagues.has(league.id)}
                    onChange={() => handleSelectLeague(league.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{league.name}</h2>
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    <span className="px-3 py-1 bg-tennis-green/10 text-tennis-green rounded-lg text-sm font-semibold">
                      {league.type === LeagueType.INTRA_TEAM ? "Takım İçi" : "Kulüp Ligi"}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold">
                      {league.format === LeagueFormat.DOUBLES ? "Çiftler" : "Bireysel"}
                    </span>
                    <span className="px-3 py-1 bg-tennis-gold/10 text-tennis-gold rounded-lg text-sm font-semibold">
                      {league.category === TeamCategory.MALE
                        ? "Erkek"
                        : league.category === TeamCategory.FEMALE
                        ? "Kadın"
                        : "Mix"}
                    </span>
                    <span className="text-gray-600 font-medium">{league.season}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Durum:{" "}
                    <span className={`font-semibold ${
                      league.status === LeagueStatus.ACTIVE
                        ? "text-tennis-green"
                        : league.status === LeagueStatus.COMPLETED
                        ? "text-gray-500"
                        : "text-gray-400"
                    }`}>
                      {league.status === LeagueStatus.ACTIVE
                        ? "Aktif"
                        : league.status === LeagueStatus.COMPLETED
                        ? "Tamamlandı"
                        : "Taslak"}
                    </span>
                  </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {league.status !== LeagueStatus.COMPLETED && (
                    <button
                      onClick={() => handleCompleteLeague(league.id)}
                      disabled={completing}
                      className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold whitespace-nowrap disabled:opacity-50"
                    >
                      {completing ? "Sonlandırılıyor..." : "Sonlandır"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteLeague(league.id)}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold whitespace-nowrap disabled:opacity-50"
                  >
                    {deleting ? "Siliniyor..." : "Sil"}
                  </button>
                  <Link
                    href={`/manager/leagues/${league.id}`}
                    className="px-6 py-2 bg-tennis-gold text-tennis-black rounded-xl hover:bg-tennis-gold/90 transition-colors font-semibold whitespace-nowrap"
                  >
                    Detaylar
                  </Link>
                </div>
              </div>

              {league.format === LeagueFormat.DOUBLES && (
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 mb-3">Takımlar ({league.teams.length})</h3>
                  {league.teams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {league.teams.map((team) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-3 bg-gradient-to-r from-tennis-green/5 to-tennis-green/10 rounded-lg border border-tennis-green/20"
                        >
                          <span className="text-sm font-medium text-gray-900">{team.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditTeam(team.id)}
                              className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors font-medium"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleRemoveTeam(league.id, team.id)}
                              className="px-3 py-1 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition-colors font-medium"
                            >
                              Çıkar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 py-2">Henüz takım yok</p>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {league.format === LeagueFormat.DOUBLES ? (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddTeam(league.id, e.target.value)
                        e.target.value = ""
                      }
                    }}
                    className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all"
                  >
                    <option value="">Takım Ekle</option>
                    {teams
                      .filter(
                        (team) =>
                          team.category === league.category &&
                          !league.teams.some((lt) => lt.id === team.id)
                      )
                      .length === 0 ? (
                      <option value="" disabled>
                        Bu kategori için takım bulunamadı
                      </option>
                    ) : (
                      teams
                        .filter(
                          (team) =>
                            team.category === league.category &&
                            !league.teams.some((lt) => lt.id === team.id)
                        )
                        .map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))
                    )}
                  </select>
                ) : (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddPlayerToLeague(league.id, e.target.value)
                        e.target.value = ""
                      }
                    }}
                    className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all"
                  >
                    <option value="">Oyuncu Ekle</option>
                    {allPlayers
                      .filter((player) => {
                        if (league.category === TeamCategory.MALE && player.gender !== "MALE") {
                          return false
                        }
                        if (league.category === TeamCategory.FEMALE && player.gender !== "FEMALE") {
                          return false
                        }
                        return !league.leaguePlayers?.some((lp: any) => lp.playerId === player.id)
                      })
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name} ({player.level || "Seviye yok"})
                        </option>
                      ))}
                  </select>
                )}
                {((league.format === LeagueFormat.DOUBLES && league.teams.length >= 2) ||
                  (league.format === LeagueFormat.INDIVIDUAL && league._count.leaguePlayers >= 2)) &&
                  league._count.matches === 0 && (
                    <button
                      onClick={() => handleGenerateFixtures(league.id)}
                      className="px-6 py-2 bg-tennis-green text-white rounded-xl hover:bg-tennis-green/90 transition-colors font-semibold whitespace-nowrap"
                    >
                      Fikstür Oluştur
                    </button>
                  )}
              </div>
            </div>
          ))}

          {leagues.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
              <div className="text-6xl mb-4">🎾</div>
              <p className="text-gray-600 text-lg">Henüz lig yok. Yeni lig oluşturun.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

