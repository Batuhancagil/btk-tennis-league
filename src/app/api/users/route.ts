import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

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

