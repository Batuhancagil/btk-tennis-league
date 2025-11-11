"use client"

import { useState } from "react"

interface LeagueDeleteConfirmProps {
  leagueName: string
  matchesCount: number
  onConfirm: () => void
  onCancel: () => void
  isDeleting?: boolean
}

export default function LeagueDeleteConfirm({
  leagueName,
  matchesCount,
  onConfirm,
  onCancel,
  isDeleting = false,
}: LeagueDeleteConfirmProps) {
  const [confirmationText, setConfirmationText] = useState("")

  const handleConfirm = () => {
    if (confirmationText === "DELETE") {
      onConfirm()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ligi Sil
        </h2>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            <span className="font-semibold">{leagueName}</span> ligini silmek
            istediğinizden emin misiniz?
          </p>

          {matchesCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                <span className="font-semibold">Uyarı:</span> Bu ligde{" "}
                <span className="font-semibold">{matchesCount}</span> maç
                bulunmaktadır. Ligi silmek tüm maçları da silecektir.
              </p>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Silmeyi onaylamak için <span className="font-mono font-bold">DELETE</span> yazın:
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
              disabled={isDeleting}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmationText !== "DELETE" || isDeleting}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </div>
    </div>
  )
}

