import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserStatus } from "@prisma/client"
import Navbar from "@/components/Navbar"

export default async function PlayerLayout({
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

  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

