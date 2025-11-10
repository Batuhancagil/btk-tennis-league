"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Navbar from "@/components/Navbar"
import { PlayerLevel } from "@prisma/client"

interface Player {
  id: string
  name: string
  gender: string
  level: PlayerLevel
}

export default function CaptainPlayersPage() {
  const { data: session } = useSession()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

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

  const handleLevelChange = async (playerId: string, level: PlayerLevel) => {
    try {
      const res = await fetch(`/api/users/${playerId}/level`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      })
      if (res.ok) {
        fetchPlayers()
      }
    } catch (error) {
      console.error("Error updating level:", error)
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
        <h1 className="text-3xl font-bold mb-6">Oyuncu Seviye Yönetimi</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  İsim
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cinsiyet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Seviye
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {players.map((player) => (
                <tr key={player.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {player.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {player.gender === "MALE" ? "Erkek" : "Kadın"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={player.level}
                      onChange={(e) =>
                        handleLevelChange(player.id, e.target.value as PlayerLevel)
                      }
                      className="border rounded px-2 py-1"
                    >
                      <option value={PlayerLevel.MASTER}>Master</option>
                      <option value={PlayerLevel.A}>A</option>
                      <option value={PlayerLevel.B}>B</option>
                      <option value={PlayerLevel.C}>C</option>
                      <option value={PlayerLevel.D}>D</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-green-600">Güncellendi</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

