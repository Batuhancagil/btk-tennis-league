"use client"

import { useState, useEffect } from "react"

interface League {
  id: string
  name: string
  format: string
}

interface Player {
  id: string
  name: string
  email: string
}

interface MatchRequestFormProps {
  onSubmit: (data: {
    leagueId: string
    opponentId: string
    message?: string
    suggestedDate?: string
    suggestedTime?: string
  }) => void
  onCancel?: () => void
}

const suggestedMessages = [
  "Maç yapmak ister misin?",
  "Hafta sonu maç yapabilir miyiz?",
  "Uygun olduğun bir zaman var mı?",
  "Maç yapalım mı?",
  "Teniste buluşalım mı?",
]

export default function MatchRequestForm({
  onSubmit,
  onCancel,
}: MatchRequestFormProps) {
  const [leagues, setLeagues] = useState<League[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("")
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>("")
  const [message, setMessage] = useState<string>("")
  const [suggestedDate, setSuggestedDate] = useState<string>("")
  const [suggestedTime, setSuggestedTime] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  useEffect(() => {
    // Fetch user's leagues
    const fetchLeagues = async () => {
      try {
        const res = await fetch("/api/leagues/player")
        const data = await res.json()
        setLeagues(data)
      } catch (error) {
        console.error("Error fetching leagues:", error)
      }
    }

    fetchLeagues()
  }, [])

  useEffect(() => {
    // Fetch players in selected league
    if (selectedLeagueId) {
      setLoadingPlayers(true)
      const fetchPlayers = async () => {
        try {
          const res = await fetch(`/api/leagues/${selectedLeagueId}`)
          const data = await res.json()
          if (data.leaguePlayers) {
            setPlayers(
              data.leaguePlayers.map((lp: any) => ({
                id: lp.player.id,
                name: lp.player.name,
                email: lp.player.email,
              }))
            )
          }
        } catch (error) {
          console.error("Error fetching players:", error)
        } finally {
          setLoadingPlayers(false)
        }
      }

      fetchPlayers()
    } else {
      setPlayers([])
      setSelectedOpponentId("")
    }
  }, [selectedLeagueId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLeagueId || !selectedOpponentId) {
      alert("Lütfen lig ve rakip seçin")
      return
    }

    setLoading(true)
    onSubmit({
      leagueId: selectedLeagueId,
      opponentId: selectedOpponentId,
      message: message.trim() || undefined,
      suggestedDate: suggestedDate || undefined,
      suggestedTime: suggestedTime || undefined,
    })
    setLoading(false)
  }

  const insertSuggestedMessage = (suggested: string) => {
    setMessage(suggested)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* League Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lig Seçin *
        </label>
        <select
          value={selectedLeagueId}
          onChange={(e) => setSelectedLeagueId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tennis-green focus:border-transparent"
          required
        >
          <option value="">Lig seçin...</option>
          {leagues.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>
      </div>

      {/* Opponent Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rakip Seçin *
        </label>
        <select
          value={selectedOpponentId}
          onChange={(e) => setSelectedOpponentId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tennis-green focus:border-transparent"
          required
          disabled={!selectedLeagueId || loadingPlayers}
        >
          <option value="">
            {loadingPlayers
              ? "Yükleniyor..."
              : !selectedLeagueId
              ? "Önce lig seçin"
              : "Rakip seçin..."}
          </option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
      </div>

      {/* Message with Suggestions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mesaj (Opsiyonel)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tennis-green focus:border-transparent"
          placeholder="Maç isteği için bir mesaj yazın..."
        />
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">Önerilen mesajlar:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedMessages.map((suggested, index) => (
              <button
                key={index}
                type="button"
                onClick={() => insertSuggestedMessage(suggested)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {suggested}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Önerilen Tarih (Opsiyonel)
        </label>
        <input
          type="date"
          value={suggestedDate}
          onChange={(e) => setSuggestedDate(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tennis-green focus:border-transparent"
        />
      </div>

      {/* Time Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Önerilen Saat (Opsiyonel)
        </label>
        <input
          type="time"
          value={suggestedTime}
          onChange={(e) => setSuggestedTime(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tennis-green focus:border-transparent"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !selectedLeagueId || !selectedOpponentId}
          className="flex-1 px-4 py-2 bg-tennis-green text-white rounded-lg hover:bg-tennis-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Gönderiliyor..." : "Maç İsteği Gönder"}
        </button>
      </div>
    </form>
  )
}

