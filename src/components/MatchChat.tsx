"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"

interface ChatMessage {
  id: string
  matchId: string
  senderId: string
  message: string
  createdAt: string
  sender: {
    id: string
    name: string
    image: string | null
  }
}

interface MatchChatProps {
  matchId: string
}

export default function MatchChat({ matchId }: MatchChatProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
  }, [matchId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/chat`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || sending) return

    const messageText = newMessage.trim()
    setNewMessage("")
    setSending(true)

    try {
      const res = await fetch(`/api/matches/${matchId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      })

      if (res.ok) {
        // Fetch updated messages
        await fetchMessages()
      } else {
        const error = await res.json()
        alert(error.error || "Mesaj gönderilemedi")
        setNewMessage(messageText) // Restore message on error
      }
    } catch (error) {
      console.error("Error sending message:", error)
      alert("Mesaj gönderilemedi")
      setNewMessage(messageText) // Restore message on error
    } finally {
      setSending(false)
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

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn
                      ? "bg-tennis-green text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {!isOwn && (
                    <div className="text-xs font-medium mb-1 opacity-75">
                      {message.sender.name}
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.message}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
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

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
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
      </form>
    </div>
  )
}

