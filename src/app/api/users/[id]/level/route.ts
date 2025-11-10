import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, PlayerLevel } from "@prisma/client"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only captains and above can update player levels
    if (
      session.user.role !== UserRole.CAPTAIN &&
      session.user.role !== UserRole.MANAGER &&
      session.user.role !== UserRole.SUPERADMIN
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { level } = await req.json()

    if (!level || !Object.values(PlayerLevel).includes(level)) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { level: level as PlayerLevel },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user level:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

