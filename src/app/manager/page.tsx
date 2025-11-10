"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
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
          <button
            onClick={() => setShowCreateLeague(true)}
            className="px-6 py-3 bg-tennis-gold text-tennis-black rounded-xl font-semibold hover:bg-tennis-gold/90 transition-all tennis-shadow-gold"
          >
            Yeni Lig Oluştur
          </button>
        </div>

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

        <div className="space-y-6">
          {leagues.map((league) => (
            <div key={league.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{league.name}</h2>
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    <span className="px-3 py-1 bg-tennis-green/10 text-tennis-green rounded-lg text-sm font-semibold">
                      {league.type === LeagueType.INTRA_TEAM ? "Takım İçi" : "Kulüp Ligi"}
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
                <Link
                  href={`/manager/leagues/${league.id}`}
                  className="px-6 py-2 bg-tennis-gold text-tennis-black rounded-xl hover:bg-tennis-gold/90 transition-colors font-semibold whitespace-nowrap"
                >
                  Detaylar
                </Link>
              </div>

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
                        <button
                          onClick={() => handleRemoveTeam(league.id, team.id)}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors font-medium"
                        >
                          Çıkar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 py-2">Henüz takım yok</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
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
                {league.teams.length >= 2 && league._count.matches === 0 && (
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

