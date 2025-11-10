"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Navbar from "@/components/Navbar"
import Link from "next/link"

interface UserProfile {
  id: string
  name: string
  gender: string
  level: string
  teams: Array<{
    team: {
      id: string
      name: string
      category: string
    }
  }>
}

export default function PlayerDashboard() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchProfile()
      fetchInvitations()
    }
  }, [session])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/users/${session?.user.id}`)
      const data = await res.json()
      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
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

  const handleInvitationResponse = async (invitationId: string, accept: boolean) => {
    try {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      })
      if (res.ok) {
        fetchInvitations()
        fetchProfile()
      }
    } catch (error) {
      console.error("Error responding to invitation:", error)
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
        <h1 className="text-3xl font-bold mb-6">Oyuncu Paneli</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Profil Bilgileri</h2>
            {profile && (
              <div className="space-y-2">
                <p><strong>İsim:</strong> {profile.name}</p>
                <p><strong>Cinsiyet:</strong> {profile.gender === "MALE" ? "Erkek" : "Kadın"}</p>
                <p><strong>Seviye:</strong> {profile.level}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Takımlarım</h2>
            {profile && profile.teams.length > 0 ? (
              <ul className="space-y-2">
                {profile.teams.map(({ team }) => (
                  <li key={team.id} className="p-2 bg-gray-50 rounded">
                    {team.name} ({team.category === "MALE" ? "Erkek" : team.category === "FEMALE" ? "Kadın" : "Mix"})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Henüz takımınız yok</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Maç Geçmişi</h2>
            <Link
              href="/player/matches"
              className="text-blue-600 hover:underline"
            >
              Tüm maçları görüntüle →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Davetler</h2>
            {invitations.length > 0 ? (
              <div className="space-y-3">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{inv.team.name}</p>
                      <p className="text-sm text-gray-500">
                        {inv.team.category === "MALE" ? "Erkek" : inv.team.category === "FEMALE" ? "Kadın" : "Mix"} Takımı
                      </p>
                    </div>
                    {inv.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleInvitationResponse(inv.id, true)}
                          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Kabul Et
                        </button>
                        <button
                          onClick={() => handleInvitationResponse(inv.id, false)}
                          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Reddet
                        </button>
                      </div>
                    )}
                    {inv.status === "ACCEPTED" && (
                      <span className="text-green-600">Kabul Edildi</span>
                    )}
                    {inv.status === "REJECTED" && (
                      <span className="text-red-600">Reddedildi</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Yeni davet yok</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

