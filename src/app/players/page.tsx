"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { Gender, PlayerLevel } from "@prisma/client"

interface Player {
  id: string
  name: string
  email: string
  gender: Gender
  level: PlayerLevel
  image?: string | null
}

export default function PlayersPage() {
  const { data: session } = useSession()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [filterGender, setFilterGender] = useState<Gender | "ALL">("ALL")
  const [filterLevel, setFilterLevel] = useState<PlayerLevel | "ALL">("ALL")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (session?.user) {
      fetchPlayers()
    }
  }, [session])

  const fetchPlayers = async () => {
    try {
      const res = await fetch("/api/users?status=APPROVED")
      const data = await res.json()
      setPlayers(data)
    } catch (error) {
      console.error("Error fetching players:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = players.filter((player) => {
    const matchesGender = filterGender === "ALL" || player.gender === filterGender
    const matchesLevel = filterLevel === "ALL" || player.level === filterLevel
    const matchesSearch =
      searchTerm === "" ||
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesGender && matchesLevel && matchesSearch
  })

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
            <h1 className="text-3xl font-bold mb-6">Oyuncular</h1>

            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="İsim veya email ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border rounded px-4 py-2"
                  />
                </div>
                <div>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value as Gender | "ALL")}
                    className="w-full border rounded px-4 py-2"
                  >
                    <option value="ALL">Tüm Cinsiyetler</option>
                    <option value={Gender.MALE}>Erkek</option>
                    <option value={Gender.FEMALE}>Kadın</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value as PlayerLevel | "ALL")}
                    className="w-full border rounded px-4 py-2"
                  >
                    <option value="ALL">Tüm Seviyeler</option>
                    <option value={PlayerLevel.MASTER}>Master</option>
                    <option value={PlayerLevel.A}>A</option>
                    <option value={PlayerLevel.B}>B</option>
                    <option value={PlayerLevel.C}>C</option>
                    <option value={PlayerLevel.D}>D</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Arama kriterlerinize uygun oyuncu bulunamadı.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Oyuncu
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Cinsiyet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Seviye
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPlayers.map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {player.image ? (
                              <img
                                src={player.image}
                                alt={player.name}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-tennis-gradient flex items-center justify-center text-white font-semibold">
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium text-gray-900">{player.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.gender === Gender.MALE ? "Erkek" : "Kadın"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              player.level === PlayerLevel.MASTER
                                ? "bg-purple-100 text-purple-800"
                                : player.level === PlayerLevel.A
                                ? "bg-red-100 text-red-800"
                                : player.level === PlayerLevel.B
                                ? "bg-orange-100 text-orange-800"
                                : player.level === PlayerLevel.C
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {player.level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Toplam {filteredPlayers.length} oyuncu gösteriliyor
                </p>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}

