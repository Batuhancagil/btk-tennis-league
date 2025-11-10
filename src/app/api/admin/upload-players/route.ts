import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, Gender, PlayerLevel } from "@prisma/client"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Dynamically import xlsx
    const XLSX = await import("xlsx")
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    const created = []
    const errors = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      try {
        const email = String(row.Email || row.email || "").trim()
        const password = String(row.Şifre || row.Password || row.password || "").trim()
        const name = String(row.İsim || row.Name || row.name || "").trim()
        const genderStr = String(row.Cinsiyet || row.Gender || row.gender || "MALE").trim().toUpperCase()
        const levelStr = String(row.Seviye || row.Level || row.level || "D").trim().toUpperCase()

        if (!email || !password || !name) {
          errors.push(`Satır ${i + 2}: Email, şifre ve isim gereklidir`)
          continue
        }

        const gender = genderStr === "FEMALE" || genderStr === "KADIN" ? Gender.FEMALE : Gender.MALE
        let level = PlayerLevel.D
        if (levelStr === "MASTER") level = PlayerLevel.MASTER
        else if (levelStr === "A") level = PlayerLevel.A
        else if (levelStr === "B") level = PlayerLevel.B
        else if (levelStr === "C") level = PlayerLevel.C
        else if (levelStr === "D") level = PlayerLevel.D

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        })

        if (existingUser) {
          errors.push(`Satır ${i + 2}: ${email} zaten mevcut`)
          continue
        }

        // Create user (password will be hashed)
        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            gender,
            level,
            status: "PENDING",
            role: "PLAYER",
          },
        })

        created.push(user.email)
      } catch (error: any) {
        errors.push(`Satır ${i + 2}: ${error.message || "Bilinmeyen hata"}`)
      }
    }

    return NextResponse.json({
      created: created.length,
      errors: errors,
    })
  } catch (error: any) {
    console.error("Error uploading players:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

