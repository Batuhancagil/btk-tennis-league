import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only superadmins can run migrations
    if (session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { action } = await req.json()

    if (action === "migrate") {
      // Run Prisma migrate deploy (for production) or migrate dev (for development)
      try {
        const { stdout, stderr } = await execAsync("npx prisma migrate deploy")
        return NextResponse.json({
          success: true,
          message: "Migration completed successfully",
          output: stdout,
          error: stderr || null,
        })
      } catch (error: any) {
        return NextResponse.json(
          {
            success: false,
            error: error.message || "Migration failed",
            output: error.stdout || null,
            stderr: error.stderr || null,
          },
          { status: 500 }
        )
      }
    } else if (action === "push") {
      // Run Prisma db push (alternative method)
      try {
        const { stdout, stderr } = await execAsync("npx prisma db push --skip-generate")
        // Generate Prisma Client after push
        await execAsync("npx prisma generate")
        return NextResponse.json({
          success: true,
          message: "Database schema pushed successfully",
          output: stdout,
          error: stderr || null,
        })
      } catch (error: any) {
        return NextResponse.json(
          {
            success: false,
            error: error.message || "Database push failed",
            output: error.stdout || null,
            stderr: error.stderr || null,
          },
          { status: 500 }
        )
      }
    } else if (action === "generate") {
      // Generate Prisma Client only
      try {
        const { stdout, stderr } = await execAsync("npx prisma generate")
        return NextResponse.json({
          success: true,
          message: "Prisma Client generated successfully",
          output: stdout,
          error: stderr || null,
        })
      } catch (error: any) {
        return NextResponse.json(
          {
            success: false,
            error: error.message || "Prisma Client generation failed",
            output: error.stdout || null,
            stderr: error.stderr || null,
          },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'migrate', 'push', or 'generate'" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error running migration:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

