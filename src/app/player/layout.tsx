import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserStatus, UserRole } from "@prisma/client"
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

  if (session.user.status !== UserStatus.APPROVED) {
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

