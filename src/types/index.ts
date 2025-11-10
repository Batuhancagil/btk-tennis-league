import { UserRole, UserStatus, Gender, TeamCategory, LeagueType, MatchStatus, MatchType, PlayerLevel } from '@prisma/client'

export type { UserRole, UserStatus, Gender, TeamCategory, LeagueType, MatchStatus, MatchType, PlayerLevel }

export interface UserWithRelations {
  id: string
  email: string
  name: string
  gender: Gender
  level: PlayerLevel
  status: UserStatus
  role: UserRole
  image?: string | null
  createdAt: Date
  updatedAt: Date
}

