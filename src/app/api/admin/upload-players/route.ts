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
    
    // Check if file is CSV
    const fileName = file.name.toLowerCase()
    const isCSV = fileName.endsWith('.csv')
    
    let workbook: any
    
    if (isCSV) {
      // For CSV files, read as UTF-8 text to preserve Turkish characters
      const arrayBuffer = await file.arrayBuffer()
      // Decode as UTF-8 to preserve Turkish characters (ğ, ç, ş, etc.)
      let text = new TextDecoder('utf-8').decode(arrayBuffer)
      
      // Remove BOM (Byte Order Mark) if present (UTF-8 BOM: EF BB BF)
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1)
      }
      
      // Detect delimiter (comma, semicolon, or tab)
      const firstLine = text.split('\n')[0]
      let delimiter = ','
      if (firstLine.includes(';')) delimiter = ';'
      else if (firstLine.includes('\t')) delimiter = '\t'
      
      // Read CSV with UTF-8 encoding
      workbook = XLSX.read(text, {
        type: "string",
        cellText: true, // Populate cell.w with formatted text
        cellDates: true,
        FS: delimiter, // Field separator
        RS: "\n", // Record separator (newline for CSV)
      })
    } else {
      // For Excel files (.xlsx, .xls), read as array buffer
      const arrayBuffer = await file.arrayBuffer()
      workbook = XLSX.read(arrayBuffer, { 
        type: "array",
        cellText: true, // Populate cell.w with formatted text to preserve UTF-8 characters
        cellDates: true,
      })
    }
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    // First, read headers to find column positions
    // Use cell.w (formatted text) to preserve Turkish characters in headers
    const headers: { [key: string]: number } = {}
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
      const cell = worksheet[cellAddress]
      if (cell) {
        // Use formatted text (w) if available, otherwise use value (v)
        const headerText = (cell.w || String(cell.v || '')).trim()
        // Normalize Turkish characters for comparison (İ -> i, Ğ -> g, etc.)
        const headerNormalized = headerText
          .toLowerCase()
          .replace(/ı/g, 'i')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
        
        // Support both Turkish and English column names
        if (headerNormalized === 'oyuncu' || headerNormalized === 'isim' || headerNormalized === 'name' || headerText.toLowerCase() === 'name') {
          headers['name'] = C
        } else if (headerNormalized === 'email' || headerNormalized === 'e-posta' || headerText.toLowerCase() === 'email') {
          headers['email'] = C
        } else if (headerNormalized === 'cinsiyet' || headerNormalized === 'gender' || headerText.toLowerCase() === 'gender') {
          headers['gender'] = C
        } else if (headerNormalized === 'seviye' || headerNormalized === 'level' || headerText.toLowerCase() === 'level') {
          headers['level'] = C
        }
      }
    }
    
    // Read data rows, accessing cells directly to preserve UTF-8 encoding
    const data: any[] = []
    for (let R = 1; R <= range.e.r; ++R) {
      const row: any = {}
      if (headers['name'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['name'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          // Get cell value, handling both v (value) and w (formatted text)
          row.name = cell.w ? String(cell.w) : (cell.v ? String(cell.v) : '')
        }
      }
      if (headers['email'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['email'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          row.email = cell.w ? String(cell.w) : (cell.v ? String(cell.v) : '')
        }
      }
      if (headers['gender'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['gender'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          row.gender = cell.w ? String(cell.w) : (cell.v ? String(cell.v) : '')
        }
      }
      if (headers['level'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['level'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          row.level = cell.w ? String(cell.w) : (cell.v ? String(cell.v) : '')
        }
      }
      
      // Only add row if it has at least name or email
      if (row.name || row.email) {
        data.push(row)
      }
    }

    const created = []
    const errors = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      try {
        // Extract values - already properly decoded from cells
        const email = (row.email || "").trim()
        const name = (row.name || "").trim()
        const genderStr = (row.gender || "").trim().toUpperCase()
        const levelStr = (row.level || "").trim().toUpperCase()

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

