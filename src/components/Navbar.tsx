"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { UserRole } from "@prisma/client"
import { useState, useEffect } from "react"
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react"

export default function Navbar() {
  const { data: session } = useSession()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "Süper Admin"
      case "MANAGER":
        return "Yönetici"
      case "CAPTAIN":
        return "Kaptan"
      default:
        return "Oyuncu"
    }
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link
            href={getDashboardPath()}
            className="flex items-center gap-3 group transition-transform hover:scale-105"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-tennis-gold opacity-20 blur-xl group-hover:opacity-30 transition-opacity rounded-full -z-10" />
              <div className="relative bg-tennis-black px-4 py-2 rounded-lg z-10">
                <span className="text-2xl font-bold text-white tracking-tight">BTK</span>
              </div>
            </div>
            <div className="hidden sm:block relative z-10">
              <div className="text-sm font-semibold text-tennis-gold tracking-wide">
                tennis kommunity
              </div>
              <div className="text-xs text-gray-600">Lig Yönetim Sistemi</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {session.user.role === UserRole.SUPERADMIN && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                <Link
                  href="/admin"
                  className="text-sm font-medium text-gray-700 hover:text-tennis-green transition-colors px-2 py-1 rounded"
                >
                  Admin
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  href="/manager"
                  className="text-sm font-medium text-gray-700 hover:text-tennis-green transition-colors px-2 py-1 rounded"
                >
                  Manager
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  href="/captain"
                  className="text-sm font-medium text-gray-700 hover:text-tennis-green transition-colors px-2 py-1 rounded"
                >
                  Captain
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  href="/player"
                  className="text-sm font-medium text-gray-700 hover:text-tennis-green transition-colors px-2 py-1 rounded"
                >
                  Player
                </Link>
              </div>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-tennis-gradient flex items-center justify-center text-white font-semibold text-sm">
                    {session.user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="text-left hidden xl:block">
                    <div className="text-sm font-medium text-gray-900">{session.user.name}</div>
                    <div className="text-xs text-tennis-gold font-medium">
                      {getRoleLabel(session.user.role)}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    isUserMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">{session.user.name}</div>
                      <div className="text-xs text-gray-500">{session.user.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        signOut()
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Çıkış Yap
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4 bg-white/95 backdrop-blur-md">
            {session.user.role === UserRole.SUPERADMIN && (
              <div className="space-y-2 mb-4">
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Admin
                </Link>
                <Link
                  href="/manager"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Manager
                </Link>
                <Link
                  href="/captain"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Captain
                </Link>
                <Link
                  href="/player"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Player
                </Link>
              </div>
            )}
            <div className="px-4 py-3 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-tennis-gradient flex items-center justify-center text-white font-semibold">
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{session.user.name}</div>
                  <div className="text-xs text-tennis-gold font-medium">
                    {getRoleLabel(session.user.role)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  signOut()
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

