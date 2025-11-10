"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Navbar from "@/components/Navbar"
import { LeagueType, LeagueStatus, TeamCategory, MatchType } from "@prisma/client"
import Link from "next/link"

interface League {
  id: string
  name: string
  type: LeagueType
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
  _count: {
    matches: number
  }
}

export default function ManagerDashboard() {
  const { data: session } = useSession()
  const [leagues, setLeagues] = useState<League[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateLeague, setShowCreateLeague] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState("")
  const [newLeagueType, setNewLeagueType] = useState<LeagueType>(LeagueType.INTRA_TEAM)
  const [newLeagueCategory, setNewLeagueCategory] = useState<TeamCategory>(TeamCategory.MALE)
  const [newLeagueSeason, setNewLeagueSeason] = useState("")

  useEffect(() => {
    if (session?.user) {
      fetchLeagues()
      fetchTeams()
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

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLeagueName,
          type: newLeagueType,
          category: newLeagueCategory,
          season: newLeagueSeason,
        }),
      })
      if (res.ok) {
        setShowCreateLeague(false)
        setNewLeagueName("")
        setNewLeagueSeason("")
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
          <h1 className="text-3xl font-bold">Lig Yöneticisi Paneli</h1>
          <button
            onClick={() => setShowCreateLeague(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Yeni Lig Oluştur
          </button>
        </div>

        {showCreateLeague && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Yeni Lig Oluştur</h2>
            <form onSubmit={handleCreateLeague} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Lig Adı</label>
                <input
                  type="text"
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Lig Tipi</label>
                <select
                  value={newLeagueType}
                  onChange={(e) => setNewLeagueType(e.target.value as LeagueType)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value={LeagueType.INTRA_TEAM}>Takım İçi</option>
                  <option value={LeagueType.CLUB}>Kulüp Ligi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kategori</label>
                <select
                  value={newLeagueCategory}
                  onChange={(e) => setNewLeagueCategory(e.target.value as TeamCategory)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value={TeamCategory.MALE}>Erkek</option>
                  <option value={TeamCategory.FEMALE}>Kadın</option>
                  <option value={TeamCategory.MIXED}>Mix</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sezon</label>
                <input
                  type="text"
                  value={newLeagueSeason}
                  onChange={(e) => setNewLeagueSeason(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="2024-2025"
                  required
                />
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
                  onClick={() => setShowCreateLeague(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-6">
          {leagues.map((league) => (
            <div key={league.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-semibold">{league.name}</h2>
                  <p className="text-gray-600">
                    {league.type === LeagueType.INTRA_TEAM ? "Takım İçi" : "Kulüp Ligi"} -{" "}
                    {league.category === TeamCategory.MALE
                      ? "Erkek"
                      : league.category === TeamCategory.FEMALE
                      ? "Kadın"
                      : "Mix"}{" "}
                    - {league.season}
                  </p>
                  <p className="text-sm text-gray-500">
                    Durum:{" "}
                    {league.status === LeagueStatus.ACTIVE
                      ? "Aktif"
                      : league.status === LeagueStatus.COMPLETED
                      ? "Tamamlandı"
                      : "Taslak"}
                  </p>
                </div>
                <Link
                  href={`/manager/leagues/${league.id}`}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Detaylar
                </Link>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Takımlar ({league.teams.length})</h3>
                {league.teams.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {league.teams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm">{team.name}</span>
                        <button
                          onClick={() => handleRemoveTeam(league.id, team.id)}
                          className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        >
                          Çıkar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Henüz takım yok</p>
                )}
              </div>

              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddTeam(league.id, e.target.value)
                      e.target.value = ""
                    }
                  }}
                  className="border rounded px-3 py-2"
                >
                  <option value="">Takım Ekle</option>
                  {teams
                    .filter(
                      (team) =>
                        team.category === league.category &&
                        !league.teams.some((lt) => lt.id === team.id)
                    )
                    .map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                </select>
                {league.teams.length >= 2 && league._count.matches === 0 && (
                  <button
                    onClick={() => handleGenerateFixtures(league.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Fikstür Oluştur
                  </button>
                )}
              </div>
            </div>
          ))}

          {leagues.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">Henüz lig yok. Yeni lig oluşturun.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

