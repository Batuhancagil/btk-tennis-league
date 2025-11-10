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
  const rounds = numTeams % 2 === 0 ? numTeams - 1 : numTeams

  // Create a rotating array
  const teams = [...teamIds]
  const fixedTeam = teams[0]

  for (let round = 0; round < rounds; round++) {
    // Rotate teams (except the first one)
    if (round > 0) {
      const lastTeam = teams.pop()!
      teams.splice(1, 0, lastTeam)
    }

    // Create matches for this round
    for (let i = 0; i < Math.floor(numTeams / 2); i++) {
      const homeIndex = i === 0 ? 0 : i + 1
      const awayIndex = numTeams - 1 - i

      fixtures.push({
        homeTeamId: teams[homeIndex],
        awayTeamId: teams[awayIndex],
        round: round + 1,
      })
    }
  }

  return fixtures
}

