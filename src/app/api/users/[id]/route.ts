import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, Gender, PlayerLevel, UserStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isSuperadmin = session.user.role === UserRole.SUPERADMIN
    
    const user = await prisma.user.findUnique({
      where: { id: params.id },
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

    // Filter sensitive fields if not superadmin
    if (!isSuperadmin) {
      const { email, status, role, ...publicUser } = user
      return NextResponse.json(publicUser)
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

    // Prepare update data
    const updateData: any = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.gender !== undefined) updateData.gender = data.gender as Gender
    if (data.level !== undefined) updateData.level = data.level as PlayerLevel
    if (data.role !== undefined) updateData.role = data.role as UserRole
    if (data.status !== undefined) updateData.status = data.status as UserStatus
    
    // Handle email update
    if (data.email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      })
      
      if (existingUser && existingUser.id !== params.id) {
        return NextResponse.json(
          { error: "Email already taken" },
          { status: 400 }
        )
      }
      
      updateData.email = data.email
    }
    
    // Handle password update
    if (data.password !== undefined && data.password !== "") {
      updateData.password = await bcrypt.hash(data.password, 10)
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        captainTeams: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Prevent deletion if user is a team captain
    if (user.captainTeams.length > 0) {
      const teamNames = user.captainTeams.map((t) => t.name).join(", ")
      return NextResponse.json(
        {
          error: `Cannot delete user who is a captain of team(s): ${teamNames}. Please reassign captain first.`,
        },
        { status: 400 }
      )
    }

    // Delete user (cascade deletes are handled by Prisma schema)
    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting user:", error)
    if (error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

