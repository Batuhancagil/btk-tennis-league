import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { UserRole, Gender, PlayerLevel, UserStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { email, password, name, gender } = data

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, şifre ve isim gereklidir" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Geçerli bir email adresi giriniz" },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalıdır" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email adresi ile zaten bir kayıt bulunmaktadır" },
        { status: 400 }
      )
    }

    // Validate gender (optional)
    if (gender !== null && gender !== undefined && gender !== Gender.MALE && gender !== Gender.FEMALE) {
      return NextResponse.json(
        { error: "Geçerli bir cinsiyet seçiniz" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with PENDING status (level will be set by superadmin)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        gender: gender || null,
        level: null, // Level will be set by superadmin
        role: UserRole.PLAYER,
        status: UserStatus.PENDING,
      },
      select: {
        id: true,
        email: true,
        name: true,
        gender: true,
        level: true,
        status: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        message: "Kayıt başarılı! Hesabınız super admin tarafından onaylandıktan sonra giriş yapabilirsiniz.",
        user,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error creating user:", error)
    
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Bu email adresi ile zaten bir kayıt bulunmaktadır" },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    )
  }
}

