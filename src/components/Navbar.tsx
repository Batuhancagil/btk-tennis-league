"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { UserRole } from "@prisma/client"

export default function Navbar() {
  const { data: session } = useSession()

  if (!session) return null

  const getDashboardPath = () => {
    switch (session.user.role) {
      case UserRole.SUPERADMIN:
        return "/admin"
      case UserRole.MANAGER:
        return "/manager"
      case UserRole.CAPTAIN:
        return "/captain"
      default:
        return "/player"
    }
  }

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href={getDashboardPath()} className="text-xl font-bold">
            BTK Tenis Ligi
          </Link>
          <div className="flex items-center gap-4">
            {session.user.role === UserRole.SUPERADMIN && (
              <div className="flex gap-2">
                <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                  Admin
                </Link>
                <Link href="/manager" className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                  Manager
                </Link>
                <Link href="/captain" className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                  Captain
                </Link>
                <Link href="/player" className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                  Player
                </Link>
              </div>
            )}
            <span className="text-sm text-gray-600">{session.user.name}</span>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
              {session.user.role}
            </span>
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Çıkış
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

