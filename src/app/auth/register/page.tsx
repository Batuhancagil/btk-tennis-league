"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail, Lock, User, ArrowRight, CheckCircle } from "lucide-react"
import { Gender, PlayerLevel } from "@prisma/client"

function RegisterForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    gender: Gender.MALE,
    level: PlayerLevel.D,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Kayıt sırasında bir hata oluştu")
        setLoading(false)
        return
      }

      // Success
      setSuccess(true)
      // Reset form
      setFormData({
        email: "",
        password: "",
        name: "",
        gender: Gender.MALE,
        level: PlayerLevel.D,
      })
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.")
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen tennis-gradient-hero relative overflow-hidden flex items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-tennis-gold opacity-30 blur-2xl rounded-full" />
                <div className="relative bg-tennis-black px-6 py-4 rounded-xl">
                  <span className="text-5xl font-bold text-white tracking-tight">BTK</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-semibold text-tennis-gold tracking-wide">
                  tennis kommunity
                </div>
                <div className="text-sm text-gray-300">Lig Yönetim Sistemi</div>
              </div>
            </div>
          </div>

          {/* Success Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Kayıt Başarılı!</h2>
              <p className="text-gray-600 mb-6">
                Hesabınız başarıyla oluşturuldu. Hesabınız super admin tarafından onaylandıktan sonra giriş yapabilirsiniz.
              </p>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 bg-tennis-gold text-tennis-black rounded-xl px-6 py-3 font-semibold text-lg hover:bg-tennis-gold/90 transition-all duration-300 tennis-shadow-gold"
              >
                <span>Giriş Sayfasına Git</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-300 text-sm mt-6">
            BTK Tennis Kommunity © 2024
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen tennis-gradient-hero relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-tennis-gold opacity-30 blur-2xl rounded-full" />
              <div className="relative bg-tennis-black px-6 py-4 rounded-xl">
                <span className="text-5xl font-bold text-white tracking-tight">BTK</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xl font-semibold text-tennis-gold tracking-wide">
                tennis kommunity
              </div>
              <div className="text-sm text-gray-300">Lig Yönetim Sistemi</div>
            </div>
          </div>
        </div>

        {/* Register Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Yeni Hesap Oluştur</h2>
          <p className="text-gray-600 text-center mb-6">Bilgilerinizi girerek kayıt olun</p>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                İsim *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all bg-white"
                  placeholder="Adınız Soyadınız"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all bg-white"
                  placeholder="ornek@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Şifre *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all bg-white"
                  placeholder="En az 6 karakter"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Şifre en az 6 karakter olmalıdır</p>
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-2">
                Cinsiyet *
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all bg-white"
              >
                <option value={Gender.MALE}>Erkek</option>
                <option value={Gender.FEMALE}>Kadın</option>
              </select>
            </div>

            <div>
              <label htmlFor="level" className="block text-sm font-semibold text-gray-700 mb-2">
                Seviye
              </label>
              <select
                id="level"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as PlayerLevel })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-tennis-gold focus:border-tennis-gold transition-all bg-white"
              >
                <option value={PlayerLevel.MASTER}>Master</option>
                <option value={PlayerLevel.A}>A</option>
                <option value={PlayerLevel.B}>B</option>
                <option value={PlayerLevel.C}>C</option>
                <option value={PlayerLevel.D}>D</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="font-semibold">Hata:</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-tennis-gold text-tennis-black rounded-xl px-6 py-3 font-semibold text-lg hover:bg-tennis-gold/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group tennis-shadow-gold"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-tennis-black"></div>
                  <span>Kayıt yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>Kayıt Ol</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Link to Sign In */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Zaten hesabınız var mı?{" "}
              <Link href="/auth/signin" className="text-tennis-gold font-semibold hover:underline">
                Giriş yapın
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-300 text-sm mt-6">
          BTK Tennis Kommunity © 2024
        </p>
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return <RegisterForm />
}

