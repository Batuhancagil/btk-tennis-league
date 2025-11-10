import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Try a simple query
    const userCount = await prisma.user.count()
    
    // Check if NextAuth tables exist
    const accountCount = await prisma.account.count().catch(() => -1)
    const sessionCount = await prisma.session.count().catch(() => -1)
    
    await prisma.$disconnect()
    
    return NextResponse.json({
      success: true,
      databaseConnected: true,
      userCount,
      accountTableExists: accountCount !== -1,
      sessionTableExists: sessionCount !== -1,
      accountCount: accountCount !== -1 ? accountCount : "N/A",
      sessionCount: sessionCount !== -1 ? sessionCount : "N/A",
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      databaseConnected: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    }, { status: 500 })
  }
}

