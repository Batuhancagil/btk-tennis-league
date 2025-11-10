"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Navbar from "@/components/Navbar"
import { InvitationStatus, UserRole } from "@prisma/client"

interface Invitation {
  id: string
  teamId: string
  playerId: string
  status: InvitationStatus
  createdAt: string
  team: {
    id: string
    name: string
    category: string
  }
  player?: {
    id: string
    name: string
    gender: string
    level: string
  }
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<InvitationStatus | "ALL">("ALL")

  useEffect(() => {
    if (session?.user) {
      fetchInvitations()
    }
  }, [session, filter])

  const fetchInvitations = async () => {
    try {
      const res = await fetch("/api/invitations")
      const data = await res.json()
      setInvitations(data)
    } catch (error) {
      console.error("Error fetching invitations:", error)
    } finally {
      setLoading(false)
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
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error responding to invitation:", error)
      alert("Hata oluştu")
    }
  }

  const filteredInvitations = invitations.filter((inv) => {
    if (filter === "ALL") return true
    return inv.status === filter
  })

  const getStatusLabel = (status: InvitationStatus) => {
    switch (status) {
      case InvitationStatus.PENDING:
        return "Beklemede"
      case InvitationStatus.ACCEPTED:
        return "Kabul Edildi"
      case InvitationStatus.REJECTED:
        return "Reddedildi"
      default:
        return status
    }
  }

  const getStatusColor = (status: InvitationStatus) => {
    switch (status) {
      case InvitationStatus.PENDING:
        return "bg-yellow-100 text-yellow-700"
      case InvitationStatus.ACCEPTED:
        return "bg-green-100 text-green-700"
      case InvitationStatus.REJECTED:
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
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

  const isPlayer = session?.user.role === UserRole.PLAYER

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Bildirimler</h1>
          <p className="text-gray-600">
            {isPlayer ? "Size gönderilen takım davetleri" : "Takımlarınıza gönderilen davetler"}
          </p>
        </div>

        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "ALL"
                  ? "bg-tennis-gold text-tennis-black"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilter(InvitationStatus.PENDING)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === InvitationStatus.PENDING
                  ? "bg-yellow-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Beklemede
            </button>
            <button
              onClick={() => setFilter(InvitationStatus.ACCEPTED)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === InvitationStatus.ACCEPTED
                  ? "bg-green-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Kabul Edilenler
            </button>
            <button
              onClick={() => setFilter(InvitationStatus.REJECTED)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === InvitationStatus.REJECTED
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Reddedilenler
            </button>
          </div>
        </div>

        {filteredInvitations.length > 0 ? (
          <div className="space-y-4">
            {filteredInvitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isPlayer ? (
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{inv.team.name}</h3>
                        <p className="text-sm text-gray-600 mb-1">
                          {inv.team.category === "MALE"
                            ? "Erkek"
                            : inv.team.category === "FEMALE"
                            ? "Kadın"
                            : "Mix"}{" "}
                          Takımı
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(inv.createdAt).toLocaleDateString("tr-TR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {inv.player?.name || "Bilinmeyen Oyuncu"}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">{inv.team.name}</p>
                        <p className="text-xs text-gray-500">
                          Seviye: {inv.player?.level || "N/A"} |{" "}
                          {inv.player?.gender === "MALE" ? "Erkek" : "Kadın"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(inv.createdAt).toLocaleDateString("tr-TR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-lg font-medium text-sm ${getStatusColor(inv.status)}`}
                    >
                      {getStatusLabel(inv.status)}
                    </span>
                    {inv.status === InvitationStatus.PENDING && isPlayer && (
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">📬</div>
            <p className="text-gray-600 text-lg">
              {filter === "ALL"
                ? "Henüz bildirim yok"
                : filter === InvitationStatus.PENDING
                ? "Bekleyen davet yok"
                : filter === InvitationStatus.ACCEPTED
                ? "Kabul edilen davet yok"
                : "Reddedilen davet yok"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

