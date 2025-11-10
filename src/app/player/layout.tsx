import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserStatus, UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import Navbar from "@/components/Navbar"
import Sidebar from "@/components/Sidebar"

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  // SUPERADMIN can access all dashboards
  if (session.user.role === UserRole.SUPERADMIN) {
    return (
      <>
        <Navbar />
        <Sidebar />
        <div className="pt-20 pl-64">{children}</div>
      </>
    )
  }

  // Handle undefined status - fetch from database if missing
  let userStatus = session.user.status as UserStatus | undefined
  if (!userStatus && session.user.email) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { status: true },
      })
      if (dbUser) {
        userStatus = dbUser.status
      }
    } catch (error) {
      console.error("[PlayerLayout] Error fetching user status:", error)
    }
  }

  // If status is still undefined or not APPROVED, redirect to pending
  if (!userStatus || userStatus !== UserStatus.APPROVED) {
    redirect("/pending")
  }

  return (
    <>
      <Navbar />
      <Sidebar />
      <div className="pt-20 pl-64">{children}</div>
    </>
  )
}

