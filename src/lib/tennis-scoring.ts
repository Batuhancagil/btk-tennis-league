/**
 * Tennis scoring utilities for validation and formatting
 */

export interface SetScore {
  reporter: number
  opponent: number
  tiebreak?: boolean
  tiebreakScore?: { reporter: number; opponent: number }
  superTiebreak?: boolean
}

export interface TennisScore {
  sets: SetScore[]
  setsWon: number
  setsLost: number
  gamesWon: number
  gamesLost: number
}

/**
 * Validate a set score according to tennis rules
 */
export function validateSetScore(
  reporter: number,
  opponent: number,
  setNumber: number,
  isTiebreak: boolean = false,
  isSuperTiebreak: boolean = false,
  tiebreakScore?: { reporter: number; opponent: number }
): { valid: boolean; error?: string } {
  if (isSuperTiebreak) {
    // Super tiebreak: first to 10 points, must win by 2
    if (reporter < 10 && opponent < 10) {
      return { valid: false, error: "Super tiebreak en az 10 puana ulaşmalı" }
    }
    if (reporter === 10 && opponent >= 10) {
      return { valid: false, error: "Super tiebreak 10-10'dan sonra 2 puan farkla bitmeli" }
    }
    if (opponent === 10 && reporter >= 10) {
      return { valid: false, error: "Super tiebreak 10-10'dan sonra 2 puan farkla bitmeli" }
    }
    if (Math.abs(reporter - opponent) < 2 && (reporter >= 10 || opponent >= 10)) {
      return { valid: false, error: "Super tiebreak 2 puan farkla bitmeli" }
    }
    if (reporter > 10 && opponent < reporter - 2) {
      return { valid: false, error: "Geçersiz super tiebreak skoru" }
    }
    if (opponent > 10 && reporter < opponent - 2) {
      return { valid: false, error: "Geçersiz super tiebreak skoru" }
    }
    return { valid: true }
  }

  if (isTiebreak) {
    // Regular tiebreak: 7-6 with tiebreak
    if (reporter !== 7 && opponent !== 7) {
      return { valid: false, error: "Tiebreak seti 7-6 olmalı" }
    }
    if (Math.abs(reporter - opponent) !== 1) {
      return { valid: false, error: "Tiebreak seti 7-6 veya 6-7 olmalı" }
    }
    if (!tiebreakScore) {
      return { valid: false, error: "Tiebreak skoru girilmelidir" }
    }
    // Tiebreak score: first to 7, must win by 2
    if (tiebreakScore.reporter < 7 && tiebreakScore.opponent < 7) {
      return { valid: false, error: "Tiebreak en az 7 puana ulaşmalı" }
    }
    if (Math.abs(tiebreakScore.reporter - tiebreakScore.opponent) < 2) {
      if (tiebreakScore.reporter < 7 || tiebreakScore.opponent < 7) {
        return { valid: false, error: "Tiebreak 2 puan farkla bitmeli" }
      }
    }
    return { valid: true }
  }

  // Regular set: first to 6 games, must win by 2
  // Valid scores: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5
  if (reporter === 6 && opponent <= 4) {
    return { valid: true }
  }
  if (opponent === 6 && reporter <= 4) {
    return { valid: true }
  }
  if (reporter === 7 && opponent === 5) {
    return { valid: true }
  }
  if (opponent === 7 && reporter === 5) {
    return { valid: true }
  }
  if (reporter === 7 && opponent === 6) {
    return { valid: false, error: "7-6 skoru için tiebreak işaretlenmelidir" }
  }
  if (opponent === 7 && reporter === 6) {
    return { valid: false, error: "6-7 skoru için tiebreak işaretlenmelidir" }
  }

  return { valid: false, error: "Geçersiz set skoru. Geçerli skorlar: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6 (tiebreak)" }
}

/**
 * Validate complete tennis match score
 */
export function validateTennisScore(sets: SetScore[]): { valid: boolean; error?: string } {
  if (sets.length < 2 || sets.length > 3) {
    return { valid: false, error: "Maç 2 veya 3 set içermelidir" }
  }

  let setsWonByReporter = 0
  let setsWonByOpponent = 0

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i]
    const validation = validateSetScore(
      set.reporter,
      set.opponent,
      i + 1,
      set.tiebreak,
      set.superTiebreak,
      set.tiebreakScore
    )

    if (!validation.valid) {
      return validation
    }

    if (set.reporter > set.opponent) {
      setsWonByReporter++
    } else {
      setsWonByOpponent++
    }
  }

  // Check if match is complete (one player won 2 sets)
  if (setsWonByReporter !== 2 && setsWonByOpponent !== 2) {
    return { valid: false, error: "Maç 2 set kazanan oyuncu tarafından kazanılmalıdır" }
  }

  // If 3 sets, check that sets are 1-1 before 3rd set
  if (sets.length === 3) {
    const firstSetWinner = sets[0].reporter > sets[0].opponent ? "reporter" : "opponent"
    const secondSetWinner = sets[1].reporter > sets[1].opponent ? "reporter" : "opponent"
    
    if (firstSetWinner === secondSetWinner) {
      return { valid: false, error: "İlk iki set aynı oyuncu tarafından kazanıldıysa 3. set oynanmaz" }
    }
  }

  return { valid: true }
}

/**
 * Calculate games won/lost from set scores
 */
export function calculateGames(sets: SetScore[]): { gamesWon: number; gamesLost: number } {
  let gamesWon = 0
  let gamesLost = 0

  for (const set of sets) {
    if (set.superTiebreak) {
      // Super tiebreak counts as 1 game each
      gamesWon += 1
      gamesLost += 1
    } else if (set.tiebreak) {
      // Tiebreak set: 6+6+1 = 13 games total
      gamesWon += 6
      gamesLost += 6
      gamesWon += 1 // Tiebreak counts as 1 game
    } else {
      gamesWon += set.reporter
      gamesLost += set.opponent
    }
  }

  return { gamesWon, gamesLost }
}

/**
 * Format tennis score for display
 */
export function formatTennisScore(sets: SetScore[]): string {
  return sets
    .map((set, index) => {
      if (set.superTiebreak) {
        return `${set.reporter}-${set.opponent} (ST)`
      }
      if (set.tiebreak && set.tiebreakScore) {
        const winner = set.reporter > set.opponent ? set.reporter : set.opponent
        const loser = set.reporter > set.opponent ? set.opponent : set.reporter
        const tiebreakWinner = set.tiebreakScore.reporter > set.tiebreakScore.opponent ? set.tiebreakScore.reporter : set.tiebreakScore.opponent
        return `${winner}-${loser}(${tiebreakWinner})`
      }
      return `${set.reporter}-${set.opponent}`
    })
    .join(", ")
}

/**
 * Convert reporter's perspective to home/away perspective
 */
export function convertToHomeAway(
  sets: SetScore[],
  reporterIsHome: boolean
): {
  setsWonHome: number
  setsWonAway: number
  gamesWonHome: number
  gamesWonAway: number
  setScores: Array<{ home: number; away: number; tiebreak?: boolean; tiebreakScore?: { home: number; away: number }; superTiebreak?: boolean }>
} {
  const setScores = sets.map((set) => {
    const home = reporterIsHome ? set.reporter : set.opponent
    const away = reporterIsHome ? set.opponent : set.reporter

    const result: any = { home, away }
    if (set.tiebreak) {
      result.tiebreak = true
      if (set.tiebreakScore) {
        result.tiebreakScore = {
          home: reporterIsHome ? set.tiebreakScore.reporter : set.tiebreakScore.opponent,
          away: reporterIsHome ? set.tiebreakScore.opponent : set.tiebreakScore.reporter,
        }
      }
    }
    if (set.superTiebreak) {
      result.superTiebreak = true
    }
    return result
  })

  let setsWonHome = 0
  let setsWonAway = 0

  for (const setScore of setScores) {
    if (setScore.home > setScore.away) {
      setsWonHome++
    } else {
      setsWonAway++
    }
  }

  const { gamesWon, gamesLost } = calculateGames(sets)
  const gamesWonHome = reporterIsHome ? gamesWon : gamesLost
  const gamesWonAway = reporterIsHome ? gamesLost : gamesWon

  return {
    setsWonHome,
    setsWonAway,
    gamesWonHome,
    gamesWonAway,
    setScores,
  }
}

