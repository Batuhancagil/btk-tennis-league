import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserRole, UserStatus } from "@prisma/client"
import Navbar from "@/components/Navbar"

export default async function CaptainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  if (session.user.status !== UserStatus.APPROVED) {
    redirect("/pending")
  }

  if (
    session.user.role !== UserRole.CAPTAIN &&
    session.user.role !== UserRole.MANAGER &&
    session.user.role !== UserRole.SUPERADMIN
  ) {
    redirect("/unauthorized")
  }

  return (
    <>
      <Navbar />
      <div className="pt-20">{children}</div>
    </>
  )
}

