import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, UserStatus } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { userId, status } = await req.json()

    if (!userId || !status) {
      return NextResponse.json({ error: "Missing userId or status" }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: status as UserStatus },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error approving user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

