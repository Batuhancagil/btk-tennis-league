"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, User, Trophy } from "lucide-react"

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    {
      href: "/teams",
      label: "Takımlar",
      icon: Users,
    },
    {
      href: "/players",
      label: "Oyuncular",
      icon: User,
    },
    {
      href: "/leagues",
      label: "Ligler",
      icon: Trophy,
    },
  ]

  return (
    <aside className="fixed left-0 top-20 h-[calc(100vh-5rem)] w-64 bg-white border-r border-gray-200 shadow-sm z-40">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-tennis-green text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100 hover:text-tennis-green"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

