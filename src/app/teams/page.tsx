"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import { TeamCategory, UserRole } from "@prisma/client"

interface Team {
  id: string
  name: string
  category: TeamCategory
  captain: {
    id: string
    name: string
    email: string
  }
  players: Array<{
    player: {
      id: string
      name: string
      gender: string
      level: string
    }
  }>
  league: {
    id: string
    name: string
  } | null
}

export default function TeamsPage() {
  const { data: session } = useSession()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<TeamCategory | "ALL">("ALL")
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const fetchTeams = useCallback(async () => {
    try {
      const categoryParam = filterCategory !== "ALL" ? `?category=${filterCategory}` : ""
      const res = await fetch(`/api/teams${categoryParam}`)
      const data = await res.json()
      setTeams(data)
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setLoading(false)
    }
  }, [filterCategory])

  useEffect(() => {
    if (session?.user) {
      fetchTeams()
    }
  }, [session, fetchTeams])

  const canDelete = session?.user?.role === UserRole.CAPTAIN || 
                    session?.user?.role === UserRole.MANAGER || 
                    session?.user?.role === UserRole.SUPERADMIN

  const canDeleteTeam = (team: Team) => {
    if (!canDelete) return false
    // Captain can only delete their own teams
    if (session?.user?.role === UserRole.CAPTAIN && team.captain.id !== session.user.id) {
      return false
    }
    // Manager and superadmin can delete any team
    return true
  }

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeams((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(teamId)) {
        newSet.delete(teamId)
      } else {
        newSet.add(teamId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedTeams.size === teams.filter((t) => canDeleteTeam(t)).length) {
      setSelectedTeams(new Set())
    } else {
      setSelectedTeams(new Set(teams.filter((t) => canDeleteTeam(t)).map((t) => t.id)))
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Bu takımı silmek istediğinize emin misiniz?")) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await fetchTeams()
        setSelectedTeams((prev) => {
          const newSet = new Set(prev)
          newSet.delete(teamId)
          return newSet
        })
      } else {
        const error = await res.json()
        alert(error.error || "Takım silinirken hata oluştu")
      }
    } catch (error) {
      console.error("Error deleting team:", error)
      alert("Takım silinirken hata oluştu")
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTeams.size === 0) return

    const count = selectedTeams.size
    if (!confirm(`${count} takımı silmek istediğinize emin misiniz?`)) return

    setDeleting(true)
    try {
      const res = await fetch("/api/teams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamIds: Array.from(selectedTeams) }),
      })

      if (res.ok) {
        const result = await res.json()
        await fetchTeams()
        setSelectedTeams(new Set())
        
        if (result.failed && result.failed.length > 0) {
          const failedMessages = result.failed.map((f: any) => `${f.teamId}: ${f.reason}`).join("\n")
          alert(`Bazı takımlar silinemedi:\n${failedMessages}`)
        } else {
          alert(`${result.successful.length} takım başarıyla silindi`)
        }
      } else {
        const error = await res.json()
        alert(error.error || "Takımlar silinirken hata oluştu")
      }
    } catch (error) {
      console.error("Error bulk deleting teams:", error)
      alert("Takımlar silinirken hata oluştu")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Takımlar</h1>
            <div className="flex gap-2 items-center">
              {canDelete && selectedTeams.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? "Siliniyor..." : `Seçilenleri Sil (${selectedTeams.size})`}
                </button>
              )}
              <button
                onClick={() => setFilterCategory("ALL")}
                className={`px-4 py-2 rounded ${
                  filterCategory === "ALL"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setFilterCategory(TeamCategory.MALE)}
                className={`px-4 py-2 rounded ${
                  filterCategory === TeamCategory.MALE
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                Erkek
              </button>
              <button
                onClick={() => setFilterCategory(TeamCategory.FEMALE)}
                className={`px-4 py-2 rounded ${
                  filterCategory === TeamCategory.FEMALE
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                Kadın
              </button>
              <button
                onClick={() => setFilterCategory(TeamCategory.MIXED)}
                className={`px-4 py-2 rounded ${
                  filterCategory === TeamCategory.MIXED
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                Mix
              </button>
            </div>
          </div>

          {canDelete && teams.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTeams.size === teams.filter((t) => canDeleteTeam(t)).length && teams.filter((t) => canDeleteTeam(t)).length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">Tümünü Seç</label>
            </div>
          )}

          {teams.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Henüz takım bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div key={team.id} className="bg-white rounded-lg shadow p-6 relative">
                  {canDeleteTeam(team) && (
                    <div className="absolute top-4 right-4">
                      <input
                        type="checkbox"
                        checked={selectedTeams.has(team.id)}
                        onChange={() => handleSelectTeam(team.id)}
                        className="w-4 h-4"
                      />
                    </div>
                  )}
                  <div className="mb-4">
                    <h2 className="text-2xl font-semibold mb-2">{team.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span
                        className={`px-2 py-1 rounded ${
                          team.category === TeamCategory.MALE
                            ? "bg-blue-100 text-blue-800"
                            : team.category === TeamCategory.FEMALE
                            ? "bg-pink-100 text-pink-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {team.category === TeamCategory.MALE
                          ? "Erkek"
                          : team.category === TeamCategory.FEMALE
                          ? "Kadın"
                          : "Mix"}
                      </span>
                      {team.league && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {team.league.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Kaptan:</span> {team.captain.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Üye Sayısı:</span> {team.players.length}
                    </p>
                  </div>

                  {team.players.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Takım Üyeleri</h3>
                      <div className="space-y-1">
                        {team.players.slice(0, 5).map(({ player }) => (
                          <div
                            key={player.id}
                            className="text-sm text-gray-600 flex items-center gap-2"
                          >
                            <span>{player.name}</span>
                            <span className="text-xs text-gray-400">
                              ({player.level} - {player.gender === "MALE" ? "E" : "K"})
                            </span>
                          </div>
                        ))}
                        {team.players.length > 5 && (
                          <p className="text-xs text-gray-400">
                            +{team.players.length - 5} daha fazla
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {canDeleteTeam(team) && (
                    <div className="mt-4 pt-4 border-t">
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        disabled={deleting}
                        className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        {deleting ? "Siliniyor..." : "Sil"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  )
}

