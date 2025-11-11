"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { DateSuggestionStatus, MatchRequestChatMessageType } from "@prisma/client"

interface ChatMessage {
  id: string
  matchId: string | null
  matchRequestId: string | null
  senderId: string
  message: string | null
  messageType: MatchRequestChatMessageType
  suggestedDate: string | null
  suggestedTime: string | null
  dateStatus: DateSuggestionStatus | null
  createdAt: string
  sender: {
    id: string
    name: string
    image: string | null
  }
}

interface MatchChatProps {
  matchId?: string
  matchRequestId?: string
  opponentId?: string
  requesterId?: string
}

export default function MatchChat({
  matchId,
  matchRequestId,
  opponentId,
  requesterId,
}: MatchChatProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [suggestedDate, setSuggestedDate] = useState("")
  const [suggestedTime, setSuggestedTime] = useState("")
  const [suggestingDate, setSuggestingDate] = useState(false)
  const [processingDateId, setProcessingDateId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isOpponent = opponentId && session?.user?.id === opponentId
  const chatEndpoint = matchRequestId
    ? `/api/match-requests/${matchRequestId}/chat`
    : `/api/matches/${matchId}/chat`

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(chatEndpoint)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }, [chatEndpoint])

  useEffect(() => {
    fetchMessages()

    // Poll for new messages every 3 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchMessages()
    }, 3000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [chatEndpoint, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || sending) return

    const messageText = newMessage.trim()
    setNewMessage("")
    setSending(true)

    try {
      const res = await fetch(chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      })

      if (res.ok) {
        await fetchMessages()
      } else {
        const error = await res.json()
        alert(error.error || "Mesaj gönderilemedi")
        setNewMessage(messageText)
      }
    } catch (error) {
      console.error("Error sending message:", error)
      alert("Mesaj gönderilemedi")
      setNewMessage(messageText)
    } finally {
      setSending(false)
    }
  }

  const handleSuggestDate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!suggestedDate || suggestingDate || !matchRequestId) return

    setSuggestingDate(true)

    try {
      const res = await fetch(chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest-date",
          suggestedDate,
          suggestedTime: suggestedTime || null,
        }),
      })

      if (res.ok) {
        setSuggestedDate("")
        setSuggestedTime("")
        setShowDatePicker(false)
        await fetchMessages()
      } else {
        const error = await res.json()
        alert(error.error || "Tarih önerisi gönderilemedi")
      }
    } catch (error) {
      console.error("Error suggesting date:", error)
      alert("Tarih önerisi gönderilemedi")
    } finally {
      setSuggestingDate(false)
    }
  }

  const handleApproveDate = async (messageId: string) => {
    if (processingDateId || !matchRequestId) return

    setProcessingDateId(messageId)

    try {
      const res = await fetch(chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve-date",
          messageId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.messages) {
          setMessages(data.messages)
        } else {
          await fetchMessages()
        }
      } else {
        const error = await res.json()
        alert(error.error || "Tarih onaylanamadı")
      }
    } catch (error) {
      console.error("Error approving date:", error)
      alert("Tarih onaylanamadı")
    } finally {
      setProcessingDateId(null)
    }
  }

  const handleRejectDate = async (messageId: string) => {
    if (processingDateId || !matchRequestId) return

    setProcessingDateId(messageId)

    try {
      const res = await fetch(chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject-date",
          messageId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.messages) {
          setMessages(data.messages)
        } else {
          await fetchMessages()
        }
      } else {
        const error = await res.json()
        alert(error.error || "Tarih reddedilemedi")
      }
    } catch (error) {
      console.error("Error rejecting date:", error)
      alert("Tarih reddedilemedi")
    } finally {
      setProcessingDateId(null)
    }
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Henüz mesaj yok. İlk mesajı siz gönderin!
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === session.user.id
            const isDateSuggestion =
              message.messageType === MatchRequestChatMessageType.DATE_SUGGESTION
            const isPendingDate =
              isDateSuggestion &&
              message.dateStatus === DateSuggestionStatus.PENDING
            const canApproveReject =
              isPendingDate && isOpponent && !isOwn && matchRequestId

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    isDateSuggestion
                      ? isOwn
                        ? "bg-blue-100 text-blue-900 border-2 border-blue-300"
                        : "bg-purple-100 text-purple-900 border-2 border-purple-300"
                      : isOwn
                      ? "bg-tennis-green text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {!isOwn && (
                    <div className="text-xs font-medium mb-1 opacity-75">
                      {message.sender.name}
                    </div>
                  )}
                  {isDateSuggestion && (
                    <div className="text-xs font-semibold mb-2 opacity-90">
                      📅 Tarih Önerisi
                    </div>
                  )}
                  {message.message && (
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {message.message}
                    </div>
                  )}
                  {isDateSuggestion && message.suggestedDate && (
                    <div className="mt-2 text-sm font-semibold">
                      {new Date(message.suggestedDate).toLocaleDateString("tr-TR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {message.suggestedTime && ` - ${message.suggestedTime}`}
                    </div>
                  )}
                  {isDateSuggestion && message.dateStatus && (
                    <div className="mt-2 text-xs">
                      {message.dateStatus === DateSuggestionStatus.APPROVED && (
                        <span className="text-green-600 font-semibold">✓ Onaylandı</span>
                      )}
                      {message.dateStatus === DateSuggestionStatus.REJECTED && (
                        <span className="text-red-600 font-semibold">✗ Reddedildi</span>
                      )}
                    </div>
                  )}
                  {canApproveReject && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleApproveDate(message.id)}
                        disabled={processingDateId === message.id}
                        className="flex-1 px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {processingDateId === message.id ? "İşleniyor..." : "Onayla"}
                      </button>
                      <button
                        onClick={() => handleRejectDate(message.id)}
                        disabled={processingDateId === message.id}
                        className="flex-1 px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        Reddet
                      </button>
                    </div>
                  )}
                  <div
                    className={`text-xs mt-2 ${
                      isOwn ? "text-white/70" : "text-gray-500"
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Date Suggestion Form */}
      {showDatePicker && matchRequestId && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <form onSubmit={handleSuggestDate} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="date"
                value={suggestedDate}
                onChange={(e) => setSuggestedDate(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tennis-green focus:border-transparent"
                required
              />
              <input
                type="time"
                value={suggestedTime}
                onChange={(e) => setSuggestedTime(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tennis-green focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!suggestedDate || suggestingDate}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suggestingDate ? "Gönderiliyor..." : "Tarih Öner"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDatePicker(false)
                  setSuggestedDate("")
                  setSuggestedTime("")
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-200 p-4">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Mesaj yazın..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tennis-green focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-2 bg-tennis-green text-white rounded-lg hover:bg-tennis-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
        {matchRequestId && (
          <button
            type="button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
          >
            {showDatePicker ? "Tarih Önerisini İptal Et" : "📅 Yeni Tarih Öner"}
          </button>
        )}
      </form>
    </div>
  )
}

