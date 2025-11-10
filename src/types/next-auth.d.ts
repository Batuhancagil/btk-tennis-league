import { UserRole, UserStatus, Gender, PlayerLevel } from "@prisma/client"
import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string | null
      role: UserRole
      status: UserStatus
      gender: Gender
      level: PlayerLevel
    }
  }

  interface User {
    role: UserRole
    status: UserStatus
    gender: Gender
    level: PlayerLevel
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    status: UserStatus
    gender: Gender
    level: PlayerLevel
  }
}

