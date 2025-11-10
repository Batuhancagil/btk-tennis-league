"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "Sunucu yapılandırmasında bir sorun var. Lütfen daha sonra tekrar deneyin."
      case "AccessDenied":
        return "Giriş izni reddedildi."
      case "Verification":
        return "Doğrulama hatası. Lütfen tekrar deneyin."
      default:
        return "Bir hata oluştu. Lütfen tekrar deneyin."
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-8">
          BTK Tenis Ligi
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Giriş Hatası
          </h2>
          <p className="text-red-700 mb-4">
            {getErrorMessage(error)}
          </p>
          <Link
            href="/auth/signin"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Giriş Sayfasına Dön
          </Link>
        </div>
      </div>
    </main>
  )
}

