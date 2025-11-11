"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import { LeagueStatus, LeagueType, TeamCategory } from "@prisma/client"
import Link from "next/link"

interface League {
  id: string
  name: string
  type: LeagueType
  category: TeamCategory
  season: string
  status: LeagueStatus
  manager: {
    id: string
    name: string
  }
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

export default function LeaguesPage() {
  const { data: session } = useSession()
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<LeagueStatus | "ALL">("ALL")
  const [filterCategory, setFilterCategory] = useState<TeamCategory | "ALL">("ALL")

  const fetchLeagues = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.append("public", "true")
      if (filterStatus !== "ALL") {
        params.append("status", filterStatus)
      }

      const res = await fetch(`/api/leagues?${params.toString()}`)
      const data = await res.json()
      
      // Apply category filter on client side since API doesn't support it
      let filteredData = data
      if (filterCategory !== "ALL") {
        filteredData = data.filter((league: League) => league.category === filterCategory)
      }
      
      setLeagues(filteredData)
    } catch (error) {
      console.error("Error fetching leagues:", error)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterCategory])

  useEffect(() => {
    if (session?.user) {
      fetchLeagues()
    }
  }, [session, fetchLeagues])

  const getStatusColor = (status: LeagueStatus) => {
    switch (status) {
      case LeagueStatus.ACTIVE:
        return "bg-green-100 text-green-800"
      case LeagueStatus.COMPLETED:
        return "bg-blue-100 text-blue-800"
      case LeagueStatus.DRAFT:
        return "bg-gray-100 text-gray-800"
      case LeagueStatus.CANCELLED:
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: LeagueStatus) => {
    switch (status) {
      case LeagueStatus.ACTIVE:
        return "Aktif"
      case LeagueStatus.COMPLETED:
        return "Tamamlandı"
      case LeagueStatus.DRAFT:
        return "Taslak"
      case LeagueStatus.CANCELLED:
        return "İptal"
      default:
        return status
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
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-6">Ligler</h1>

            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Durum</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as LeagueStatus | "ALL")}
                    className="w-full border rounded px-4 py-2"
                  >
                    <option value="ALL">Tüm Durumlar</option>
                    <option value={LeagueStatus.DRAFT}>Taslak</option>
                    <option value={LeagueStatus.ACTIVE}>Aktif</option>
                    <option value={LeagueStatus.COMPLETED}>Tamamlandı</option>
                    <option value={LeagueStatus.CANCELLED}>İptal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Kategori</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as TeamCategory | "ALL")}
                    className="w-full border rounded px-4 py-2"
                  >
                    <option value="ALL">Tüm Kategoriler</option>
                    <option value={TeamCategory.MALE}>Erkek</option>
                    <option value={TeamCategory.FEMALE}>Kadın</option>
                    <option value={TeamCategory.MIXED}>Mix</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {leagues.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Arama kriterlerinize uygun lig bulunamadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leagues.map((league) => (
                <div key={league.id} className="bg-white rounded-lg shadow p-6">
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h2 className="text-2xl font-semibold">{league.name}</h2>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(league.status)}`}>
                        {getStatusLabel(league.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      <span
                        className={`px-2 py-1 rounded ${
                          league.category === TeamCategory.MALE
                            ? "bg-blue-100 text-blue-800"
                            : league.category === TeamCategory.FEMALE
                            ? "bg-pink-100 text-pink-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {league.category === TeamCategory.MALE
                          ? "Erkek"
                          : league.category === TeamCategory.FEMALE
                          ? "Kadın"
                          : "Mix"}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {league.type === LeagueType.INTRA_TEAM ? "Takım İçi" : "Kulüp"}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {league.season}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Yönetici:</span> {league.manager.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Takım Sayısı:</span> {league.teams.length}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Maç Sayısı:</span> {league._count.matches}
                    </p>
                  </div>

                  {league.teams.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold mb-2">Takımlar</h3>
                      <div className="space-y-1">
                        {league.teams.slice(0, 3).map((team) => (
                          <div key={team.id} className="text-sm text-gray-600">
                            {team.name}
                          </div>
                        ))}
                        {league.teams.length > 3 && (
                          <p className="text-xs text-gray-400">
                            +{league.teams.length - 3} daha fazla
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {league.status === LeagueStatus.ACTIVE && (
                    <Link
                      href={`/manager/leagues/${league.id}`}
                      className="block w-full text-center px-4 py-2 bg-tennis-green text-white rounded hover:bg-tennis-green/90 transition-colors"
                    >
                      Detayları Görüntüle
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  )
}

