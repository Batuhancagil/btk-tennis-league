import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, Gender, PlayerLevel, UserStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get("status")
    const role = searchParams.get("role")

    const where: any = {}
    if (status) where.status = status
    if (role) where.role = role

    // Superadmin can see all users, others see limited data
    if (session.user.role === UserRole.SUPERADMIN) {
      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          gender: true,
          level: true,
          status: true,
          role: true,
          image: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json(users)
    }

    // Other roles see limited user data
    const users = await prisma.user.findMany({
      where: {
        ...where,
        status: "APPROVED",
      },
      select: {
        id: true,
        name: true,
        gender: true,
        level: true,
        image: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const data = await req.json()
    const { email, password, name, gender, level } = data

    if (!email || !password || !name || !gender) {
      return NextResponse.json(
        { error: "Email, password, name, and gender are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        gender: gender as Gender,
        level: (level as PlayerLevel) || PlayerLevel.D,
        role: UserRole.PLAYER,
        status: UserStatus.APPROVED,
      },
      select: {
        id: true,
        email: true,
        name: true,
        gender: true,
        level: true,
        status: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

