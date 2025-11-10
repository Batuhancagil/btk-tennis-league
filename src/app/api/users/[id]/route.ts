import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: session.user.role === UserRole.SUPERADMIN,
        name: true,
        gender: true,
        level: true,
        status: session.user.role === UserRole.SUPERADMIN,
        role: session.user.role === UserRole.SUPERADMIN,
        image: true,
        createdAt: true,
        teams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const data = await req.json()

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.gender && { gender: data.gender }),
        ...(data.level && { level: data.level }),
        ...(data.role && { role: data.role }),
        ...(data.status && { status: data.status }),
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

