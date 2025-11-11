"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import Navbar from "@/components/Navbar"
import { TeamCategory } from "@prisma/client"

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

interface Invitation {
  id: string
  teamId: string
  playerId: string
  status: string
}

export default function CaptainDashboard() {
  const { data: session } = useSession()
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamCategory, setNewTeamCategory] = useState<TeamCategory>(TeamCategory.MALE)
  const [newTeamMaxPlayers, setNewTeamMaxPlayers] = useState<number | null>(null)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editTeamName, setEditTeamName] = useState("")
  const [editTeamCategory, setEditTeamCategory] = useState<TeamCategory>(TeamCategory.MALE)
  const [editTeamMaxPlayers, setEditTeamMaxPlayers] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [showExcelUpload, setShowExcelUpload] = useState(false)
  const [uploadingExcel, setUploadingExcel] = useState(false)
  const [selectedPlayersForInvite, setSelectedPlayersForInvite] = useState<{ [teamId: string]: string[] }>({})
  const [searchQuery, setSearchQuery] = useState<{ [teamId: string]: string }>({})
  const [dropdownOpen, setDropdownOpen] = useState<{ [teamId: string]: boolean }>({})

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/teams")
      const data = await res.json()
      // Filter to show only teams where user is captain
      const myTeams = data.filter((team: Team) => team.captain.id === session?.user.id)
      setTeams(myTeams)
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?status=APPROVED")
      const data = await res.json()
      setPlayers(data)
    } catch (error) {
      console.error("Error fetching players:", error)
    }
  }, [])

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch("/api/invitations")
      const data = await res.json()
      setInvitations(data)
    } catch (error) {
      console.error("Error fetching invitations:", error)
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      fetchTeams()
      fetchPlayers()
      fetchInvitations()
    }
  }, [session, fetchTeams, fetchPlayers, fetchInvitations])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName,
          category: newTeamCategory,
          maxPlayers: newTeamMaxPlayers,
        }),
      })
      if (res.ok) {
        setShowCreateTeam(false)
        setNewTeamName("")
        setNewTeamMaxPlayers(null)
        fetchTeams()
      }
    } catch (error) {
      console.error("Error creating team:", error)
    }
  }

  const handleInvitePlayer = async (teamId: string, playerId: string) => {
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, playerId }),
      })
      if (res.ok) {
        // Refresh invitations to get updated status
        fetchInvitations()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error inviting player:", error)
      alert("Hata oluştu")
    }
  }

  const handleInviteSelectedPlayers = async (teamId: string) => {
    const selectedIds = selectedPlayersForInvite[teamId] || []
    if (selectedIds.length === 0) {
      alert("Lütfen en az bir oyuncu seçin")
      return
    }

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, playerIds: selectedIds }),
      })
      
      const data = await res.json()
      if (res.ok) {
        let message = `${data.created || selectedIds.length} oyuncu davet edildi`
        if (data.errors && data.errors.length > 0) {
          message += `\nHatalar: ${data.errors.length}`
          if (data.errors.length <= 5) {
            message += `\n${data.errors.join("\n")}`
          }
        }
        alert(message)
        // Clear selections and search
        setSelectedPlayersForInvite(prev => ({ ...prev, [teamId]: [] }))
        setSearchQuery(prev => ({ ...prev, [teamId]: "" }))
        setDropdownOpen(prev => ({ ...prev, [teamId]: false }))
        fetchInvitations()
      } else {
        alert(data.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error inviting players:", error)
      alert("Hata oluştu")
    }
  }

  const togglePlayerSelection = (teamId: string, playerId: string) => {
    setSelectedPlayersForInvite(prev => {
      const current = prev[teamId] || []
      if (current.includes(playerId)) {
        return { ...prev, [teamId]: current.filter(id => id !== playerId) }
      } else {
        return { ...prev, [teamId]: [...current, playerId] }
      }
    })
  }

  const getAvailablePlayers = (team: Team) => {
    return players.filter((player) => {
      // Filter players based on team category
      if (team.category === TeamCategory.MALE && player.gender !== "MALE") {
        return false
      }
      if (team.category === TeamCategory.FEMALE && player.gender !== "FEMALE") {
        return false
      }
      // Check if player is already in team
      if (team.players.some((tp) => tp.player.id === player.id)) {
        return false
      }
      // Filter by search query
      const query = (searchQuery[team.id] || "").toLowerCase()
      if (query && !player.name.toLowerCase().includes(query)) {
        return false
      }
      return true
    })
  }

  const isPlayerInvited = (teamId: string, playerId: string) => {
    return invitations.some(
      (inv) => inv.teamId === teamId && inv.playerId === playerId
    )
  }

  const handleEditTeam = async (team: Team) => {
    try {
      const res = await fetch(`/api/teams/${team.id}`)
      const data = await res.json()
      setEditingTeam(data)
      setEditTeamName(data.name)
      setEditTeamCategory(data.category)
      setEditTeamMaxPlayers(data.maxPlayers || null)
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

  const handleRemovePlayer = async (teamId: string, playerId: string) => {
    if (!confirm("Oyuncuyu takımdan çıkarmak istediğinize emin misiniz?")) return

    try {
      const res = await fetch(`/api/teams/${teamId}/players?playerId=${playerId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchTeams()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error removing player:", error)
      alert("Hata oluştu")
    }
  }

  const handleAddPlayerDirectly = async (teamId: string, playerId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      })
      if (res.ok) {
        // Refresh team data if editing
        if (editingTeam && editingTeam.id === teamId) {
          await handleEditTeam(editingTeam)
        }
        fetchTeams()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error adding player:", error)
      alert("Hata oluştu")
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/captain/download-template")
      if (!res.ok) {
        throw new Error("Template indirme başarısız")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "takim-template.xlsx"
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

      const res = await fetch("/api/captain/upload-teams", {
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
        await fetchTeams()
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
        Object.keys(dropdownOpen).forEach(teamId => {
          if (dropdownOpen[teamId]) {
            setDropdownOpen(prev => ({ ...prev, [teamId]: false }))
          }
        })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

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
          <h1 className="text-3xl font-bold">Kaptan Paneli</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowExcelUpload(!showExcelUpload)}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              {showExcelUpload ? "İptal" : "📊 Excel ile Yükle"}
            </button>
            <button
              onClick={() => setShowCreateTeam(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Yeni Takım Oluştur
            </button>
          </div>
        </div>

        {showExcelUpload && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">Excel ile Takım Yükle</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Excel dosyası formatı: <strong>Takım Adı</strong>, <strong>Kategori</strong> (MALE/FEMALE/MIXED veya Erkek/Kadın/Mix)
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Not: Takım adı zorunludur.
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

        {showCreateTeam && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Yeni Takım Oluştur</h2>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Takım Adı</label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Kategori</label>
                  <select
                    value={newTeamCategory}
                    onChange={(e) => setNewTeamCategory(e.target.value as TeamCategory)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value={TeamCategory.MALE}>Erkek</option>
                    <option value={TeamCategory.FEMALE}>Kadın</option>
                    <option value={TeamCategory.MIXED}>Mix</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Maksimum Oyuncu Sayısı</label>
                  <input
                    type="number"
                    min="1"
                    value={newTeamMaxPlayers || ""}
                    onChange={(e) => setNewTeamMaxPlayers(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Sınırsız"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Oluştur
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {editingTeam && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-blue-200">
            <h2 className="text-xl font-semibold mb-4">Takımı Düzenle</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Takım Adı</label>
                  <input
                    type="text"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Kategori</label>
                  <select
                    value={editTeamCategory}
                    onChange={(e) => setEditTeamCategory(e.target.value as TeamCategory)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value={TeamCategory.MALE}>Erkek</option>
                    <option value={TeamCategory.FEMALE}>Kadın</option>
                    <option value={TeamCategory.MIXED}>Mix</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Maksimum Oyuncu Sayısı</label>
                  <input
                    type="number"
                    min="1"
                    value={editTeamMaxPlayers || ""}
                    onChange={(e) => setEditTeamMaxPlayers(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Sınırsız"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Takım Üyeleri</label>
                <div className="space-y-2 mb-4">
                  {editingTeam.players && editingTeam.players.length > 0 ? (
                    editingTeam.players.map(({ player }: any) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span>
                          {player.name} - {player.level} ({player.gender === "MALE" ? "E" : "K"})
                        </span>
                        {editingTeam.captain.id !== player.id && (
                          <button
                            onClick={() => handleRemovePlayer(editingTeam.id, player.id)}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                          >
                            Çıkar
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Henüz üye yok</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Oyuncu Ekle</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddPlayerDirectly(editingTeam.id, e.target.value)
                        e.target.value = ""
                      }
                    }}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Oyuncu Seç</option>
                    {players
                      .filter((player) => {
                        // Filter players based on team category
                        if (editTeamCategory === TeamCategory.MALE && player.gender !== "MALE") {
                          return false
                        }
                        if (editTeamCategory === TeamCategory.FEMALE && player.gender !== "FEMALE") {
                          return false
                        }
                        // Check if player is already in team
                        return !editingTeam.players.some((tp: any) => tp.player.id === player.id)
                      })
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name} ({player.level})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleSaveTeam}
                  disabled={saving}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-semibold">{team.name}</h2>
                  <p className="text-gray-600">
                    {team.category === TeamCategory.MALE
                      ? "Erkek"
                      : team.category === TeamCategory.FEMALE
                      ? "Kadın"
                      : "Mix"}{" "}
                    Takımı
                  </p>
                </div>
                <button
                  onClick={() => handleEditTeam(team)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Düzenle
                </button>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Takım Üyeleri</h3>
                {team.players.length > 0 ? (
                  <ul className="space-y-2">
                    {team.players.map(({ player }) => (
                      <li key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>
                          {player.name} - {player.level} ({player.gender === "MALE" ? "E" : "K"})
                        </span>
                        {editingTeam?.id === team.id && team.captain.id !== player.id && (
                          <button
                            onClick={() => handleRemovePlayer(team.id, player.id)}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                          >
                            Çıkar
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">Henüz üye yok</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Oyuncu Davet Et</h3>
                <div className="relative dropdown-container">
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Oyuncu ara..."
                        value={searchQuery[team.id] || ""}
                        onChange={(e) => {
                          setSearchQuery(prev => ({ ...prev, [team.id]: e.target.value }))
                          setDropdownOpen(prev => ({ ...prev, [team.id]: true }))
                        }}
                        onFocus={() => setDropdownOpen(prev => ({ ...prev, [team.id]: true }))}
                        className="w-full border rounded px-3 py-2 pr-10"
                      />
                      {searchQuery[team.id] && (
                        <button
                          onClick={() => {
                            setSearchQuery(prev => ({ ...prev, [team.id]: "" }))
                            setDropdownOpen(prev => ({ ...prev, [team.id]: false }))
                          }}
                          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleInviteSelectedPlayers(team.id)}
                      disabled={(selectedPlayersForInvite[team.id] || []).length === 0}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Davet Et ({(selectedPlayersForInvite[team.id] || []).length})
                    </button>
                  </div>

                  {/* Selected players chips */}
                  {(selectedPlayersForInvite[team.id] || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedPlayersForInvite[team.id].map((playerId) => {
                        const player = players.find(p => p.id === playerId)
                        if (!player) return null
                        return (
                          <span
                            key={playerId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                          >
                            {player.name}
                            <button
                              onClick={() => togglePlayerSelection(team.id, playerId)}
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
                  {dropdownOpen[team.id] && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                      {getAvailablePlayers(team).length === 0 ? (
                        <div className="p-3 text-gray-500 text-sm">Oyuncu bulunamadı</div>
                      ) : (
                        getAvailablePlayers(team).map((player) => {
                          const isSelected = (selectedPlayersForInvite[team.id] || []).includes(player.id)
                          const isInvited = isPlayerInvited(team.id, player.id)
                          return (
                            <div
                              key={player.id}
                              onClick={() => {
                                if (!isInvited) {
                                  togglePlayerSelection(team.id, player.id)
                                }
                              }}
                              className={`p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between ${
                                isSelected ? "bg-blue-50" : ""
                              } ${isInvited ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <span className="text-sm">
                                {player.name} ({player.level})
                              </span>
                              {isInvited ? (
                                <span className="text-xs text-green-600 font-medium">Davet Edildi</span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  onClick={(e) => e.stopPropagation()}
                                  className="ml-2"
                                />
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {teams.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">Henüz takımınız yok. Yeni takım oluşturun.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

