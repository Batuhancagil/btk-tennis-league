"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { MatchStatus } from "@prisma/client"

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

interface Match {
  id: string
  homeTeam: {
    id: string
    name: string
  }
  awayTeam: {
    id: string
    name: string
  }
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  squads: Array<{
    teamId: string
    player: {
      id: string
      name: string
    }
  }>
}

export default function PlayerDashboard() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [matchStats, setMatchStats] = useState({
    totalMatches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
  })

  useEffect(() => {
    if (session?.user) {
      fetchProfile()
      fetchInvitations()
      fetchMatchStats()
    }
  }, [session])

  const fetchMatchStats = async () => {
    try {
      const res = await fetch("/api/matches")
      const data = await res.json()
      // Filter matches where player participated
      const playerMatches = data.filter((match: Match) =>
        match.squads.some((squad) => squad.player.id === session?.user.id)
      )

      const playedMatches = playerMatches.filter(
        (m: Match) => m.status === MatchStatus.PLAYED && m.homeScore !== null && m.awayScore !== null
      )

      let wins = 0
      let losses = 0
      let draws = 0

      playedMatches.forEach((match: Match) => {
        const playerSquad = match.squads.find((s) => s.player.id === session?.user.id)
        if (!playerSquad) return

        const isHomeTeam = playerSquad.teamId === match.homeTeam.id
        const playerScore = isHomeTeam ? match.homeScore! : match.awayScore!
        const opponentScore = isHomeTeam ? match.awayScore! : match.homeScore!

        if (playerScore > opponentScore) {
          wins++
        } else if (playerScore < opponentScore) {
          losses++
        } else {
          draws++
        }
      })

      setMatchStats({
        totalMatches: playedMatches.length,
        wins,
        losses,
        draws,
      })
    } catch (error) {
      console.error("Error fetching match stats:", error)
    }
  }

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Oyuncu Paneli</h1>
          <p className="text-gray-600">Profil bilgileriniz ve takımlarınız</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-tennis-gradient flex items-center justify-center text-white font-semibold">
                {profile?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <h2 className="text-xl font-bold text-gray-900">Profil Bilgileri</h2>
            </div>
            {profile && (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">İsim:</span>
                  <span className="text-gray-900 font-semibold">{profile.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Cinsiyet:</span>
                  <span className="text-gray-900 font-semibold">{profile.gender === "MALE" ? "Erkek" : "Kadın"}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 font-medium">Seviye:</span>
                  <span className="px-3 py-1 bg-tennis-green/10 text-tennis-green rounded-lg font-semibold">{profile.level}</span>
                </div>
              </div>
            )}
          </div>

          {/* Teams Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Takımlarım</h2>
            {profile && profile.teams.length > 0 ? (
              <ul className="space-y-2">
                {profile.teams.map(({ team }) => (
                  <li key={team.id} className="p-3 bg-gradient-to-r from-tennis-green/5 to-tennis-green/10 rounded-lg border border-tennis-green/20 hover:border-tennis-green/40 transition-colors">
                    <div className="font-semibold text-gray-900">{team.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {team.category === "MALE" ? "Erkek" : team.category === "FEMALE" ? "Kadın" : "Mix"} Takımı
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-4">Henüz takımınız yok</p>
            )}
          </div>

          {/* Matches Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Maç Geçmişi</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Toplam Maç</div>
                <div className="text-xl font-bold text-gray-900">{matchStats.totalMatches}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Galibiyet</div>
                <div className="text-xl font-bold text-green-600">{matchStats.wins}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Beraberlik</div>
                <div className="text-xl font-bold text-yellow-600">{matchStats.draws}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Mağlubiyet</div>
                <div className="text-xl font-bold text-red-600">{matchStats.losses}</div>
              </div>
            </div>
            <Link
              href="/player/matches"
              className="inline-flex items-center gap-2 px-4 py-2 bg-tennis-gold text-tennis-black rounded-lg font-semibold hover:bg-tennis-gold/90 transition-colors"
            >
              Tüm maçları görüntüle
              <span>→</span>
            </Link>
          </div>

          {/* Invitations Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow md:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Davetler</h2>
            {invitations.length > 0 ? (
              <div className="space-y-3">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900">{inv.team.name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {inv.team.category === "MALE" ? "Erkek" : inv.team.category === "FEMALE" ? "Kadın" : "Mix"} Takımı
                      </p>
                    </div>
                    {inv.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleInvitationResponse(inv.id, true)}
                          className="px-4 py-2 bg-tennis-green text-white rounded-lg hover:bg-tennis-green/90 transition-colors font-medium"
                        >
                          Kabul Et
                        </button>
                        <button
                          onClick={() => handleInvitationResponse(inv.id, false)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                        >
                          Reddet
                        </button>
                      </div>
                    )}
                    {inv.status === "ACCEPTED" && (
                      <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">Kabul Edildi</span>
                    )}
                    {inv.status === "REJECTED" && (
                      <span className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium">Reddedildi</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Yeni davet yok</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

