"use client"

import { signOut } from "next-auth/react"

export default function PendingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Hesabınız Onay Bekliyor
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Hesabınız superadmin tarafından onaylandıktan sonra sistemi kullanabileceksiniz.
        </p>
        <div className="flex justify-center">
          <button
            onClick={() => signOut()}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </main>
  )
}

