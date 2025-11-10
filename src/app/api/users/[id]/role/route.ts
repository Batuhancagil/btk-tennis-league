import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { role } = await req.json()

    if (!role || !Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { role: role as UserRole },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user role:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

