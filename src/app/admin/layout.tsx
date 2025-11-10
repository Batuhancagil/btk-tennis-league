import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"
import Navbar from "@/components/Navbar"
import Sidebar from "@/components/Sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== UserRole.SUPERADMIN) {
    redirect("/unauthorized")
  }

  return (
    <>
      <Navbar />
      <Sidebar />
      <div className="pt-20 pl-64">{children}</div>
    </>
  )
}

