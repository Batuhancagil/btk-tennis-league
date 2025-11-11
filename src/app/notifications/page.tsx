"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Navbar from "@/components/Navbar"
import { InvitationStatus, UserRole, NotificationType, MatchRequestStatus } from "@prisma/client"
import Link from "next/link"
import { useRouter } from "next/navigation"

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

interface Notification {
  id: string
  type: NotificationType
  message: string
  read: boolean
  createdAt: string
  matchRequest?: {
    id: string
    requesterId: string
    opponentId: string
    status: string
    requester: {
      id: string
      name: string
    }
    opponent: {
      id: string
      name: string
    }
    league: {
      id: string
      name: string
    }
    message: string | null
    suggestedDate: string | null
    suggestedTime: string | null
  }
  match?: {
    id: string
    scheduledDate: string | null
    status: string
  }
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "invitations" | "matchRequests">("all")
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetchInvitations()
      fetchNotifications()
    }
  }, [session])

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

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications")
      const data = await res.json()
      setNotifications(data)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      })
      fetchNotifications()
    } catch (error) {
      console.error("Error marking notification as read:", error)
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
        fetchNotifications()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error responding to invitation:", error)
      alert("Hata oluştu")
    }
  }

  const handleMatchRequestResponse = async (requestId: string, accept: boolean) => {
    try {
      const res = await fetch(`/api/match-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: accept ? "accept" : "reject" }),
      })
      if (res.ok) {
        fetchNotifications()
        if (accept) {
          alert("Maç isteği kabul edildi. Maç oluşturuldu!")
        } else {
          alert("Maç isteği reddedildi")
        }
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error responding to match request:", error)
      alert("Hata oluştu")
    }
  }

  const filteredInvitations = invitations.filter((inv) => {
    if (filter === "all" || filter === "invitations") return true
    return false
  })

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "all") return true
    if (filter === "matchRequests") {
      return notif.type === NotificationType.MATCH_REQUEST ||
             notif.type === NotificationType.MATCH_ACCEPTED ||
             notif.type === NotificationType.MATCH_REJECTED
    }
    return false
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
            Takım davetleri ve maç istekleri
          </p>
        </div>

        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "all"
                  ? "bg-tennis-gold text-tennis-black"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilter("invitations")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "invitations"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Takım Davetleri
            </button>
            <button
              onClick={() => setFilter("matchRequests")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "matchRequests"
                  ? "bg-tennis-green text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Maç İstekleri
            </button>
          </div>
        </div>

        {/* Match Request Notifications */}
        {filteredNotifications.length > 0 && (
          <div className="space-y-4 mb-6">
            {filteredNotifications.map((notif) => {
              if (!notif.matchRequest) return null

              const isUnread = !notif.read
              const isMatchRequest = notif.type === NotificationType.MATCH_REQUEST

              return (
                <div
                  key={notif.id}
                  className={`bg-white rounded-xl shadow-lg p-6 border-2 transition-all ${
                    isUnread ? "border-tennis-green bg-tennis-green/5" : "border-gray-200"
                  } hover:shadow-xl`}
                  onClick={() => {
                    if (isUnread) {
                      markAsRead(notif.id)
                    }
                    setSelectedNotification(notif)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isUnread && (
                          <span className="w-2 h-2 bg-tennis-green rounded-full"></span>
                        )}
                        <h3 className="text-xl font-bold text-gray-900">
                          {notif.matchRequest.requester.name} size maç isteği gönderdi
                        </h3>
                      </div>
                      <p className="text-gray-700 mb-2">
                        <span className="font-semibold">Lig:</span> {notif.matchRequest.league.name}
                      </p>
                      {notif.matchRequest.message && (
                        <p className="text-gray-600 mb-2 italic">
                          &quot;{notif.matchRequest.message}&quot;
                        </p>
                      )}
                      {notif.matchRequest.suggestedDate && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Önerilen Tarih:</span>{" "}
                          {new Date(notif.matchRequest.suggestedDate).toLocaleDateString("tr-TR")}
                          {notif.matchRequest.suggestedTime && ` - ${notif.matchRequest.suggestedTime}`}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notif.createdAt).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {isMatchRequest && notif.matchRequest.status === MatchRequestStatus.PENDING && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMatchRequestResponse(notif.matchRequest!.id, true)
                            }}
                            className="px-4 py-2 bg-tennis-green text-white rounded-lg hover:bg-tennis-green/90 transition-colors font-medium"
                          >
                            Kabul Et
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMatchRequestResponse(notif.matchRequest!.id, false)
                            }}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                          >
                            Reddet
                          </button>
                        </div>
                      )}
                      {(notif.matchRequest.status === MatchRequestStatus.PENDING ||
                        notif.matchRequest.status === MatchRequestStatus.ACCEPTED) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/player/match-requests?chat=${notif.matchRequest!.id}`)
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                        >
                          💬 Chat'e Git
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Invitations */}
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
          filteredNotifications.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
              <div className="text-6xl mb-4">📬</div>
              <p className="text-gray-600 text-lg">
                {filter === "all"
                  ? "Henüz bildirim yok"
                  : filter === "invitations"
                  ? "Henüz takım daveti yok"
                  : "Henüz maç isteği yok"}
              </p>
            </div>
          )
        )}

        {/* Notification Detail Modal */}
        {selectedNotification && selectedNotification.matchRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Maç İsteği Detayları</h2>
              <div className="space-y-3">
                <p>
                  <span className="font-semibold">Gönderen:</span>{" "}
                  {selectedNotification.matchRequest.requester.name}
                </p>
                <p>
                  <span className="font-semibold">Lig:</span>{" "}
                  {selectedNotification.matchRequest.league.name}
                </p>
                {selectedNotification.matchRequest.message && (
                  <p>
                    <span className="font-semibold">Mesaj:</span>{" "}
                    {selectedNotification.matchRequest.message}
                  </p>
                )}
                {selectedNotification.matchRequest.suggestedDate && (
                  <p>
                    <span className="font-semibold">Önerilen Tarih:</span>{" "}
                    {new Date(selectedNotification.matchRequest.suggestedDate).toLocaleDateString("tr-TR")}
                    {selectedNotification.matchRequest.suggestedTime && ` - ${selectedNotification.matchRequest.suggestedTime}`}
                  </p>
                )}
                {selectedNotification.match && (
                  <p className="text-green-600 font-semibold">
                    ✓ Maç oluşturuldu
                  </p>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                {selectedNotification.type === NotificationType.MATCH_REQUEST && 
                 selectedNotification.matchRequest?.status === MatchRequestStatus.PENDING && (
                  <>
                    <button
                      onClick={() => {
                        handleMatchRequestResponse(selectedNotification.matchRequest!.id, true)
                        setSelectedNotification(null)
                      }}
                      className="flex-1 px-4 py-2 bg-tennis-green text-white rounded-lg hover:bg-tennis-green/90 transition-colors font-medium"
                    >
                      Kabul Et
                    </button>
                    <button
                      onClick={() => {
                        handleMatchRequestResponse(selectedNotification.matchRequest!.id, false)
                        setSelectedNotification(null)
                      }}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                    >
                      Reddet
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

