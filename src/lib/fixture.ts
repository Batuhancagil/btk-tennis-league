/**
 * Round-robin fixture generator
 * Creates matches for all teams to play against each other
 */

export interface FixtureMatch {
  homeTeamId: string
  awayTeamId: string
  round: number
}

export function generateRoundRobinFixtures(teamIds: string[]): FixtureMatch[] {
  if (teamIds.length < 2) {
    return []
  }

  const fixtures: FixtureMatch[] = []
  const numTeams = teamIds.length
  
  // Standard round-robin: if even teams, n-1 rounds; if odd teams, n rounds
  const rounds = numTeams % 2 === 0 ? numTeams - 1 : numTeams

  // Handle odd number of teams by adding a "bye" team temporarily
  const teams = [...teamIds]
  const hasBye = numTeams % 2 === 1
  if (hasBye) {
    teams.push("__BYE__") // Temporary bye marker
  }

  // Fix the first team, rotate others clockwise each round
  const fixedTeam = teams[0]
  const rotatingTeams = teams.slice(1)

  for (let round = 0; round < rounds; round++) {
    // Rotate clockwise: move last element to front
    if (round > 0) {
      const lastTeam = rotatingTeams.pop()!
      rotatingTeams.unshift(lastTeam)
    }

    // Create pairing array for this round
    const pairingArray = [fixedTeam, ...rotatingTeams]
    const numPairs = Math.floor(pairingArray.length / 2)

    // Pair teams: first vs last, second vs second-to-last, etc.
    for (let i = 0; i < numPairs; i++) {
      const homeIndex = i
      const awayIndex = pairingArray.length - 1 - i
      const homeTeam = pairingArray[homeIndex]
      const awayTeam = pairingArray[awayIndex]

      // Skip matches involving the bye team
      if (homeTeam !== "__BYE__" && awayTeam !== "__BYE__") {
        fixtures.push({
          homeTeamId: homeTeam,
          awayTeamId: awayTeam,
          round: round + 1,
        })
      }
    }
  }

  return fixtures
}

