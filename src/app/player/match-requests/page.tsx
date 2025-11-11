"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Navbar from "@/components/Navbar"
import MatchRequestForm from "@/components/MatchRequestForm"
import { MatchRequestStatus } from "@prisma/client"

interface MatchRequest {
  id: string
  leagueId: string
  requesterId: string
  opponentId: string
  message: string | null
  suggestedDate: string | null
  suggestedTime: string | null
  status: MatchRequestStatus
  createdAt: string
  requester: {
    id: string
    name: string
    email: string
  }
  opponent: {
    id: string
    name: string
    email: string
  }
  league: {
    id: string
    name: string
    format: string
  }
  match: {
    id: string
    status: string
    scheduledDate: string | null
  } | null
}

export default function MatchRequestsPage() {
  const { data: session } = useSession()
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showRequestForm, setShowRequestForm] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchMatchRequests()
    }
  }, [session, filter])

  const fetchMatchRequests = async () => {
    try {
      setLoading(true)
      const type = filter === "all" ? null : filter
      const url = type
        ? `/api/match-requests?type=${type}`
        : "/api/match-requests"
      const res = await fetch(url)
      const data = await res.json()
      setMatchRequests(data)
    } catch (error) {
      console.error("Error fetching match requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (requestId: string) => {
    try {
      setProcessingId(requestId)
      const res = await fetch(`/api/match-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      })

      if (res.ok) {
        fetchMatchRequests()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error accepting match request:", error)
      alert("Hata oluştu")
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    try {
      setProcessingId(requestId)
      const res = await fetch(`/api/match-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      })

      if (res.ok) {
        fetchMatchRequests()
      } else {
        const error = await res.json()
        alert(error.error || "Hata oluştu")
      }
    } catch (error) {
      console.error("Error rejecting match request:", error)
      alert("Hata oluştu")
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusLabel = (status: MatchRequestStatus) => {
    switch (status) {
      case MatchRequestStatus.PENDING:
        return "Beklemede"
      case MatchRequestStatus.ACCEPTED:
        return "Kabul Edildi"
      case MatchRequestStatus.REJECTED:
        return "Reddedildi"
      default:
        return status
    }
  }

  const getStatusColor = (status: MatchRequestStatus) => {
    switch (status) {
      case MatchRequestStatus.PENDING:
        return "bg-yellow-100 text-yellow-800"
      case MatchRequestStatus.ACCEPTED:
        return "bg-green-100 text-green-800"
      case MatchRequestStatus.REJECTED:
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredRequests = matchRequests

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Maç İstekleri
            </h1>
            <button
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="px-6 py-3 bg-tennis-green text-white rounded-lg hover:bg-tennis-green/90 transition-colors font-semibold"
            >
              {showRequestForm ? "İptal" : "+ Yeni Maç İsteği"}
            </button>
          </div>

          {/* Match Request Form */}
          {showRequestForm && (
            <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Yeni Maç İsteği Gönder</h2>
              <MatchRequestForm
                onSubmit={async (data) => {
                  try {
                    const res = await fetch("/api/match-requests", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(data),
                    })

                    if (res.ok) {
                      setShowRequestForm(false)
                      fetchMatchRequests()
                      alert("Maç isteği başarıyla gönderildi!")
                    } else {
                      const error = await res.json()
                      alert(error.error || "Hata oluştu")
                    }
                  } catch (error) {
                    console.error("Error sending match request:", error)
                    alert("Hata oluştu")
                  }
                }}
                onCancel={() => setShowRequestForm(false)}
              />
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === "all"
                  ? "text-tennis-green border-b-2 border-tennis-green"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilter("sent")}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === "sent"
                  ? "text-tennis-green border-b-2 border-tennis-green"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Gönderilenler
            </button>
            <button
              onClick={() => setFilter("received")}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === "received"
                  ? "text-tennis-green border-b-2 border-tennis-green"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Gelenler
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tennis-green"></div>
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const isReceived = request.opponentId === session.user.id
                const otherPerson = isReceived ? request.requester : request.opponent

                return (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {isReceived
                              ? `${otherPerson.name} size maç isteği gönderdi`
                              : `${otherPerson.name} adlı oyuncuya maç isteği gönderdiniz`}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-lg font-medium text-sm ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {getStatusLabel(request.status)}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            <span className="font-medium">Lig:</span>{" "}
                            {request.league.name}
                          </p>
                          {request.message && (
                            <p>
                              <span className="font-medium">Mesaj:</span>{" "}
                              {request.message}
                            </p>
                          )}
                          {request.suggestedDate && (
                            <p>
                              <span className="font-medium">Önerilen Tarih:</span>{" "}
                              {new Date(request.suggestedDate).toLocaleDateString(
                                "tr-TR"
                              )}
                            </p>
                          )}
                          {request.suggestedTime && (
                            <p>
                              <span className="font-medium">Önerilen Saat:</span>{" "}
                              {request.suggestedTime}
                            </p>
                          )}
                          {request.match && (
                            <p className="text-green-600 font-medium">
                              ✓ Maç oluşturuldu
                            </p>
                          )}
                        </div>
                      </div>

                      {request.status === MatchRequestStatus.PENDING &&
                        isReceived && (
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleAccept(request.id)}
                              disabled={processingId === request.id}
                              className="px-4 py-2 bg-tennis-green text-white rounded-lg hover:bg-tennis-green/90 transition-colors font-medium disabled:opacity-50"
                            >
                              {processingId === request.id
                                ? "İşleniyor..."
                                : "Kabul Et"}
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              disabled={processingId === request.id}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
                            >
                              Reddet
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
              <div className="text-6xl mb-4">📬</div>
              <p className="text-gray-600 text-lg">
                {filter === "all"
                  ? "Henüz maç isteği yok"
                  : filter === "sent"
                  ? "Gönderilen maç isteği yok"
                  : "Gelen maç isteği yok"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

