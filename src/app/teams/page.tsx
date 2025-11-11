"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import { TeamCategory } from "@prisma/client"

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
            <div className="flex gap-2">
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

          {teams.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Henüz takım bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div key={team.id} className="bg-white rounded-lg shadow p-6">
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
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  )
}

