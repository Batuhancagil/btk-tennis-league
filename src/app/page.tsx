"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Trophy, Users, Calendar, Activity } from "lucide-react"

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
      <main className="flex min-h-screen flex-col items-center justify-center tennis-gradient-hero">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tennis-gold mx-auto mb-4"></div>
          <div className="text-lg">Yükleniyor...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen tennis-gradient-hero relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        <div className="max-w-4xl w-full text-center space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4 mb-8 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-tennis-gold opacity-30 blur-2xl rounded-full animate-pulse" />
              <div className="relative bg-tennis-black px-8 py-6 rounded-2xl tennis-shadow-gold">
                <span className="text-6xl md:text-7xl font-bold text-white tracking-tight">BTK</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl md:text-3xl font-semibold text-tennis-gold tracking-wide">
                tennis kommunity
              </div>
              <div className="text-lg text-gray-300">Lig Yönetim Sistemi</div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Tenis Kulübü
            <br />
            <span className="text-tennis-gold">Yönetim Platformu</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Takımlarınızı yönetin, maçlarınızı organize edin ve tenis ligi deneyimini yaşayın
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/auth/signin"
              className="group px-8 py-4 bg-tennis-gold text-tennis-black rounded-xl font-semibold text-lg hover:bg-tennis-gold/90 transition-all duration-300 tennis-shadow-gold flex items-center gap-2 hover:scale-105"
            >
              Giriş Yap
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/signin"
              className="px-8 py-4 border-2 border-tennis-gold text-tennis-gold rounded-xl font-semibold text-lg hover:bg-tennis-gold/10 transition-all duration-300 flex items-center gap-2"
            >
              Daha Fazla Bilgi
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
              <div className="w-12 h-12 bg-tennis-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-tennis-gold" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Lig Yönetimi</h3>
              <p className="text-gray-300">Takımlarınızı organize edin ve ligleri yönetin</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
              <div className="w-12 h-12 bg-tennis-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-tennis-gold" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Takım Yönetimi</h3>
              <p className="text-gray-300">Oyuncularınızı yönetin ve takımlar oluşturun</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
              <div className="w-12 h-12 bg-tennis-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-tennis-gold" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Maç Takvimi</h3>
              <p className="text-gray-300">Fikstür oluşturun ve maçları takip edin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-tennis-green/20 to-transparent"></div>
    </main>
  )
}

