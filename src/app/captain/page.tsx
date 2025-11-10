"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
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
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editTeamName, setEditTeamName] = useState("")
  const [editTeamCategory, setEditTeamCategory] = useState<TeamCategory>(TeamCategory.MALE)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchTeams()
      fetchPlayers()
      fetchInvitations()
    }
  }, [session])

  const fetchTeams = async () => {
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
  }

  const fetchPlayers = async () => {
    try {
      const res = await fetch("/api/users?status=APPROVED")
      const data = await res.json()
      setPlayers(data)
    } catch (error) {
      console.error("Error fetching players:", error)
    }
  }

  const fetchInvitations = async () => {
    try {
      const res = await fetch("/api/invitations")
      const data = await res.json()
      setInvitations(data)
    } catch (error) {
      console.error("Error fetching invitations:", error)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName,
          category: newTeamCategory,
        }),
      })
      if (res.ok) {
        setShowCreateTeam(false)
        setNewTeamName("")
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

  const isPlayerInvited = (teamId: string, playerId: string) => {
    return invitations.some(
      (inv) => inv.teamId === teamId && inv.playerId === playerId
    )
  }

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team)
    setEditTeamName(team.name)
    setEditTeamCategory(team.category)
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
          <button
            onClick={() => setShowCreateTeam(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Yeni Takım Oluştur
          </button>
        </div>

        {showCreateTeam && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Yeni Takım Oluştur</h2>
            <form onSubmit={handleCreateTeam} className="space-y-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {players
                    .filter((player) => {
                      // Filter players based on team category
                      if (team.category === TeamCategory.MALE && player.gender !== "MALE") {
                        return false
                      }
                      if (team.category === TeamCategory.FEMALE && player.gender !== "FEMALE") {
                        return false
                      }
                      // Check if player is already in team
                      return !team.players.some((tp) => tp.player.id === player.id)
                    })
                    .map((player) => {
                      const isInvited = isPlayerInvited(team.id, player.id)
                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm">
                            {player.name} ({player.level})
                          </span>
                          <div className="flex gap-1">
                            {editingTeam?.id === team.id ? (
                              <button
                                onClick={() => handleAddPlayerDirectly(team.id, player.id)}
                                className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                              >
                                Ekle
                              </button>
                            ) : isInvited ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
                                Davet Edildi
                              </span>
                            ) : (
                              <button
                                onClick={() => handleInvitePlayer(team.id, player.id)}
                                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                              >
                                Davet Et
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
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

