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
    // Read Excel file (XLSX library handles UTF-8 automatically)
    const workbook = XLSX.read(arrayBuffer, { 
      type: "array",
    })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    // Convert to JSON with proper encoding for Turkish characters
    // Using raw: false ensures we get formatted text values which preserves UTF-8 characters
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false, // Get formatted text values to preserve Turkish characters (ğ, ç, ş, etc.)
      defval: "", // Default value for empty cells
    }) as any[]

    const created = []
    const errors = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      try {
        // Support both Turkish and English column names
        // Use String() to ensure proper UTF-8 handling
        const email = String(row.Email || row.email || "").trim()
        // Handle Turkish characters properly - ensure UTF-8 encoding
        const nameRaw = row.Oyuncu || row.İsim || row.Name || row.name || ""
        const name = typeof nameRaw === 'string' ? nameRaw.trim() : String(nameRaw).trim()
        const genderStr = String(row.Cinsiyet || row.Gender || row.gender || "").trim().toUpperCase()
        const levelStr = String(row.Seviye || row.Level || row.level || "").trim().toUpperCase()

        // Only email and name are required (password will be auto-generated)
        if (!email || !name) {
          errors.push(`Satır ${i + 2}: Email ve oyuncu adı gereklidir`)
          continue
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          errors.push(`Satır ${i + 2}: Geçersiz email formatı: ${email}`)
          continue
        }

        let gender: Gender | null = null
        if (genderStr === "FEMALE" || genderStr === "KADIN" || genderStr === "F") {
          gender = Gender.FEMALE
        } else if (genderStr === "MALE" || genderStr === "ERKEK" || genderStr === "M" || genderStr === "E") {
          gender = Gender.MALE
        }

        let level: PlayerLevel | null = null
        if (levelStr === "MASTER" || levelStr === "M") level = PlayerLevel.MASTER
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

        // Generate default password (email-based for uniqueness)
        const defaultPassword = `Tennis${email.split("@")[0]}123!`
        const hashedPassword = await bcrypt.hash(defaultPassword, 10)

        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            gender: gender || null,
            level: level || null,
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

