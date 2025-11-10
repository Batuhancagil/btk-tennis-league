"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (session?.user) {
      // Redirect based on role
      if (session.user.role === "SUPERADMIN") {
        router.push("/admin")
      } else if (session.user.role === "MANAGER") {
        router.push("/manager")
      } else if (session.user.role === "CAPTAIN") {
        router.push("/captain")
      } else {
        router.push("/player")
      }
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">Yükleniyor...</div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          BTK Tenis Ligi Yönetim Sistemi
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Sisteme giriş yapmak için lütfen giriş sayfasına gidin.
        </p>
        <div className="flex justify-center">
          <Link
            href="/auth/signin"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    </main>
  )
}

