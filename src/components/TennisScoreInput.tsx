"use client"

import { useState, useEffect } from "react"
import { validateSetScore, validateTennisScore, type SetScore } from "@/lib/tennis-scoring"

interface TennisScoreInputProps {
  onSubmit: (sets: SetScore[]) => void
  onCancel?: () => void
  initialSets?: SetScore[]
  disabled?: boolean
}

export default function TennisScoreInput({
  onSubmit,
  onCancel,
  initialSets,
  disabled = false,
}: TennisScoreInputProps) {
  const [sets, setSets] = useState<Array<Partial<SetScore>>>(() => {
    if (initialSets) {
      return initialSets.map((s) => ({ ...s }))
    }
    return [
      { reporter: undefined, opponent: undefined, tiebreak: false },
      { reporter: undefined, opponent: undefined, tiebreak: false },
      { reporter: undefined, opponent: undefined, superTiebreak: false },
    ]
  })

  const [errors, setErrors] = useState<{ [key: number]: string }>({})
  const [showSet3, setShowSet3] = useState(false)

  useEffect(() => {
    // Show set 3 if sets 1 and 2 are both filled and result in 1-1
    if (
      sets[0].reporter !== undefined &&
      sets[0].opponent !== undefined &&
      sets[1].reporter !== undefined &&
      sets[1].opponent !== undefined
    ) {
      const set1Winner = sets[0].reporter! > sets[0].opponent! ? "reporter" : "opponent"
      const set2Winner = sets[1].reporter! > sets[1].opponent! ? "reporter" : "opponent"
      setShowSet3(set1Winner !== set2Winner)
    } else {
      setShowSet3(false)
    }
  }, [sets])

  const updateSet = (
    index: number,
    field: keyof SetScore,
    value: any
  ) => {
    const newSets = [...sets]
    if (!newSets[index]) {
      newSets[index] = {}
    }
    ;(newSets[index] as any)[field] = value
    setSets(newSets)

    // Clear error for this set
    if (errors[index]) {
      const newErrors = { ...errors }
      delete newErrors[index]
      setErrors(newErrors)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: number]: string } = {}

    // Validate and build complete sets array
    const completeSets: SetScore[] = []
    let hasErrors = false

    for (let i = 0; i < (showSet3 ? 3 : 2); i++) {
      const set = sets[i]
      if (
        set.reporter === undefined ||
        set.opponent === undefined ||
        set.reporter === null ||
        set.opponent === null
      ) {
        newErrors[i] = "Set skoru girilmelidir"
        hasErrors = true
        continue
      }

      const reporter = parseInt(set.reporter.toString())
      const opponent = parseInt(set.opponent.toString())

      const isSuperTiebreak = i === 2 && set.superTiebreak
      const isTiebreak = set.tiebreak || false

      const validation = validateSetScore(
        reporter,
        opponent,
        i + 1,
        isTiebreak,
        isSuperTiebreak,
        set.tiebreakScore
          ? {
              reporter: parseInt(set.tiebreakScore.reporter.toString()),
              opponent: parseInt(set.tiebreakScore.opponent.toString()),
            }
          : undefined
      )

      if (!validation.valid) {
        newErrors[i] = validation.error || "Geçersiz set skoru"
        hasErrors = true
        continue
      }

      completeSets.push({
        reporter,
        opponent,
        tiebreak: isTiebreak,
        tiebreakScore: set.tiebreakScore
          ? {
              reporter: parseInt(set.tiebreakScore.reporter.toString()),
              opponent: parseInt(set.tiebreakScore.opponent.toString()),
            }
          : undefined,
        superTiebreak: isSuperTiebreak,
      })
    }

    if (hasErrors) {
      setErrors(newErrors)
      return
    }

    // Validate complete match score
    const matchValidation = validateTennisScore(completeSets)
    if (!matchValidation.valid) {
      setErrors({ [-1]: matchValidation.error || "Geçersiz maç skoru" })
      return
    }

    onSubmit(completeSets)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors[-1] && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {errors[-1]}
        </div>
      )}

      {/* Set 1 */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">Set 1</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Sizin Oyunlarınız</label>
            <input
              type="number"
              min="0"
              max="7"
              value={sets[0].reporter || ""}
              onChange={(e) =>
                updateSet(0, "reporter", e.target.value ? parseInt(e.target.value) : undefined)
              }
              disabled={disabled}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rakibin Oyunları</label>
            <input
              type="number"
              min="0"
              max="7"
              value={sets[0].opponent || ""}
              onChange={(e) =>
                updateSet(0, "opponent", e.target.value ? parseInt(e.target.value) : undefined)
              }
              disabled={disabled}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
        </div>
        {sets[0].reporter === 7 && sets[0].opponent === 6 && (
          <div className="mt-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sets[0].tiebreak || false}
                onChange={(e) => updateSet(0, "tiebreak", e.target.checked)}
                disabled={disabled}
                className="mr-2"
              />
              <span className="text-sm">Tiebreak oynandı</span>
            </label>
            {sets[0].tiebreak && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Tiebreak Sizin</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={sets[0].tiebreakScore?.reporter || ""}
                    onChange={(e) =>
                      updateSet(0, "tiebreakScore", {
                        reporter: e.target.value ? parseInt(e.target.value) : undefined,
                        opponent: sets[0].tiebreakScore?.opponent,
                      })
                    }
                    disabled={disabled}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tiebreak Rakip</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={sets[0].tiebreakScore?.opponent || ""}
                    onChange={(e) =>
                      updateSet(0, "tiebreakScore", {
                        reporter: sets[0].tiebreakScore?.reporter,
                        opponent: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    disabled={disabled}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {sets[0].opponent === 7 && sets[0].reporter === 6 && (
          <div className="mt-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sets[0].tiebreak || false}
                onChange={(e) => updateSet(0, "tiebreak", e.target.checked)}
                disabled={disabled}
                className="mr-2"
              />
              <span className="text-sm">Tiebreak oynandı</span>
            </label>
            {sets[0].tiebreak && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Tiebreak Sizin</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={sets[0].tiebreakScore?.reporter || ""}
                    onChange={(e) =>
                      updateSet(0, "tiebreakScore", {
                        reporter: e.target.value ? parseInt(e.target.value) : undefined,
                        opponent: sets[0].tiebreakScore?.opponent,
                      })
                    }
                    disabled={disabled}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tiebreak Rakip</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={sets[0].tiebreakScore?.opponent || ""}
                    onChange={(e) =>
                      updateSet(0, "tiebreakScore", {
                        reporter: sets[0].tiebreakScore?.reporter,
                        opponent: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    disabled={disabled}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {errors[0] && <p className="text-red-600 text-sm mt-1">{errors[0]}</p>}
      </div>

      {/* Set 2 */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">Set 2</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Sizin Oyunlarınız</label>
            <input
              type="number"
              min="0"
              max="7"
              value={sets[1].reporter || ""}
              onChange={(e) =>
                updateSet(1, "reporter", e.target.value ? parseInt(e.target.value) : undefined)
              }
              disabled={disabled}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rakibin Oyunları</label>
            <input
              type="number"
              min="0"
              max="7"
              value={sets[1].opponent || ""}
              onChange={(e) =>
                updateSet(1, "opponent", e.target.value ? parseInt(e.target.value) : undefined)
              }
              disabled={disabled}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
        </div>
        {(sets[1].reporter === 7 && sets[1].opponent === 6) ||
        (sets[1].opponent === 7 && sets[1].reporter === 6) ? (
          <div className="mt-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sets[1].tiebreak || false}
                onChange={(e) => updateSet(1, "tiebreak", e.target.checked)}
                disabled={disabled}
                className="mr-2"
              />
              <span className="text-sm">Tiebreak oynandı</span>
            </label>
            {sets[1].tiebreak && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Tiebreak Sizin</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={sets[1].tiebreakScore?.reporter || ""}
                    onChange={(e) =>
                      updateSet(1, "tiebreakScore", {
                        reporter: e.target.value ? parseInt(e.target.value) : undefined,
                        opponent: sets[1].tiebreakScore?.opponent,
                      })
                    }
                    disabled={disabled}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tiebreak Rakip</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={sets[1].tiebreakScore?.opponent || ""}
                    onChange={(e) =>
                      updateSet(1, "tiebreakScore", {
                        reporter: sets[1].tiebreakScore?.reporter,
                        opponent: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    disabled={disabled}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
        {errors[1] && <p className="text-red-600 text-sm mt-1">{errors[1]}</p>}
      </div>

      {/* Set 3 - Only shown if sets are 1-1 */}
      {showSet3 && (
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">Set 3</h3>
          <div className="mb-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sets[2].superTiebreak || false}
                onChange={(e) => updateSet(2, "superTiebreak", e.target.checked)}
                disabled={disabled}
                className="mr-2"
              />
              <span className="text-sm">Süper Tiebreak (10 puanlık)</span>
            </label>
          </div>
          {sets[2].superTiebreak ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sizin Puanlarınız</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={sets[2].reporter || ""}
                  onChange={(e) =>
                    updateSet(2, "reporter", e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={disabled}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rakibin Puanları</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={sets[2].opponent || ""}
                  onChange={(e) =>
                    updateSet(2, "opponent", e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={disabled}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sizin Oyunlarınız</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={sets[2].reporter || ""}
                  onChange={(e) =>
                    updateSet(2, "reporter", e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={disabled}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rakibin Oyunları</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={sets[2].opponent || ""}
                  onChange={(e) =>
                    updateSet(2, "opponent", e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={disabled}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
            </div>
          )}
          {errors[2] && <p className="text-red-600 text-sm mt-1">{errors[2]}</p>}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={disabled}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          Gönder
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
          >
            İptal
          </button>
        )}
      </div>
    </form>
  )
}

