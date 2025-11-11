/**
 * Round-robin fixture generator
 * Creates matches for all teams/players to play against each other
 */

export interface FixtureMatch {
  homeTeamId?: string
  awayTeamId?: string
  homePlayerId?: string
  awayPlayerId?: string
  round: number
}

export function generateRoundRobinFixtures(ids: string[]): FixtureMatch[] {
  if (ids.length < 2) {
    return []
  }

  const fixtures: FixtureMatch[] = []
  const numParticipants = ids.length
  
  // Standard round-robin: if even participants, n-1 rounds; if odd participants, n rounds
  const rounds = numParticipants % 2 === 0 ? numParticipants - 1 : numParticipants

  // Handle odd number of participants by adding a "bye" temporarily
  const participants = [...ids]
  const hasBye = numParticipants % 2 === 1
  if (hasBye) {
    participants.push("__BYE__") // Temporary bye marker
  }

  // Fix the first participant, rotate others clockwise each round
  const fixedParticipant = participants[0]
  const rotatingParticipants = participants.slice(1)

  for (let round = 0; round < rounds; round++) {
    // Rotate clockwise: move last element to front
    if (round > 0) {
      const lastParticipant = rotatingParticipants.pop()!
      rotatingParticipants.unshift(lastParticipant)
    }

    // Create pairing array for this round
    const pairingArray = [fixedParticipant, ...rotatingParticipants]
    const numPairs = Math.floor(pairingArray.length / 2)

    // Pair participants: first vs last, second vs second-to-last, etc.
    for (let i = 0; i < numPairs; i++) {
      const homeIndex = i
      const awayIndex = pairingArray.length - 1 - i
      const homeParticipant = pairingArray[homeIndex]
      const awayParticipant = pairingArray[awayIndex]

      // Skip matches involving the bye participant
      if (homeParticipant !== "__BYE__" && awayParticipant !== "__BYE__") {
        fixtures.push({
          homeTeamId: homeParticipant,
          awayTeamId: awayParticipant,
          round: round + 1,
        })
      }
    }
  }

  return fixtures
}

export function generatePlayerFixtures(playerIds: string[]): FixtureMatch[] {
  if (playerIds.length < 2) {
    return []
  }

  const fixtures: FixtureMatch[] = []
  const numPlayers = playerIds.length
  
  // Standard round-robin: if even players, n-1 rounds; if odd players, n rounds
  const rounds = numPlayers % 2 === 0 ? numPlayers - 1 : numPlayers

  // Handle odd number of players by adding a "bye" temporarily
  const players = [...playerIds]
  const hasBye = numPlayers % 2 === 1
  if (hasBye) {
    players.push("__BYE__") // Temporary bye marker
  }

  // Fix the first player, rotate others clockwise each round
  const fixedPlayer = players[0]
  const rotatingPlayers = players.slice(1)

  for (let round = 0; round < rounds; round++) {
    // Rotate clockwise: move last element to front
    if (round > 0) {
      const lastPlayer = rotatingPlayers.pop()!
      rotatingPlayers.unshift(lastPlayer)
    }

    // Create pairing array for this round
    const pairingArray = [fixedPlayer, ...rotatingPlayers]
    const numPairs = Math.floor(pairingArray.length / 2)

    // Pair players: first vs last, second vs second-to-last, etc.
    for (let i = 0; i < numPairs; i++) {
      const homeIndex = i
      const awayIndex = pairingArray.length - 1 - i
      const homePlayer = pairingArray[homeIndex]
      const awayPlayer = pairingArray[awayIndex]

      // Skip matches involving the bye player
      if (homePlayer !== "__BYE__" && awayPlayer !== "__BYE__") {
        fixtures.push({
          homePlayerId: homePlayer,
          awayPlayerId: awayPlayer,
          round: round + 1,
        })
      }
    }
  }

  return fixtures
}

