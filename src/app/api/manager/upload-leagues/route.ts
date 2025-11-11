import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeagueType, LeagueStatus, TeamCategory } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
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
      let text = new TextDecoder('utf-8').decode(arrayBuffer)
      
      // Remove BOM (Byte Order Mark) if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1)
      }
      
      // Detect delimiter
      const firstLine = text.split('\n')[0]
      let delimiter = ','
      if (firstLine.includes(';')) delimiter = ';'
      else if (firstLine.includes('\t')) delimiter = '\t'
      
      workbook = XLSX.read(text, {
        type: "string",
        cellText: true,
        cellDates: true,
        FS: delimiter,
      })
    } else {
      // For Excel files
      const arrayBuffer = await file.arrayBuffer()
      workbook = XLSX.read(arrayBuffer, { 
        type: "array",
        cellText: true,
        cellDates: true,
      })
    }
    
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    // Read headers
    const headers: { [key: string]: number } = {}
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
      const cell = worksheet[cellAddress]
      if (cell) {
        const headerText = (cell.w || String(cell.v || '')).trim()
        const headerNormalized = headerText
          .toLowerCase()
          .replace(/ı/g, 'i')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
        
        if (headerNormalized === 'lig adı' || headerNormalized === 'lig adi' || headerNormalized === 'name' || headerText.toLowerCase() === 'name') {
          headers['name'] = C
        } else if (headerNormalized === 'lig tipi' || headerNormalized === 'type' || headerText.toLowerCase() === 'type') {
          headers['type'] = C
        } else if (headerNormalized === 'kategori' || headerNormalized === 'category' || headerText.toLowerCase() === 'category') {
          headers['category'] = C
        } else if (headerNormalized === 'sezon' || headerNormalized === 'season' || headerText.toLowerCase() === 'season') {
          headers['season'] = C
        }
      }
    }
    
    // Read data rows
    const data: any[] = []
    for (let R = 1; R <= range.e.r; ++R) {
      const row: any = {}
      if (headers['name'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['name'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          row.name = cell.w ? String(cell.w) : (cell.v ? String(cell.v) : '')
        }
      }
      if (headers['type'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['type'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          row.type = cell.w ? String(cell.w) : (cell.v ? String(cell.v) : '')
        }
      }
      if (headers['category'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['category'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          row.category = cell.w ? String(cell.w) : (cell.v ? String(cell.v) : '')
        }
      }
      if (headers['season'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['season'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          row.season = cell.w ? String(cell.w) : (cell.v ? String(cell.v) : '')
        }
      }
      
      // Only add row if it has at least name
      if (row.name) {
        data.push(row)
      }
    }

    const created = []
    const errors = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      try {
        const name = (row.name || "").trim()
        const typeStr = (row.type || "").trim().toUpperCase()
        const categoryStr = (row.category || "").trim().toUpperCase()
        const season = (row.season || "").trim()

        if (!name) {
          errors.push(`Satır ${i + 2}: Lig adı gereklidir`)
          continue
        }

        if (!season) {
          errors.push(`Satır ${i + 2}: Sezon gereklidir`)
          continue
        }

        // Parse league type
        let type: LeagueType
        if (typeStr === "INTRA_TEAM" || typeStr === "TAKIM İÇİ" || typeStr === "TAKIM ICI" || typeStr === "TAKIM İCI") {
          type = LeagueType.INTRA_TEAM
        } else if (typeStr === "CLUB" || typeStr === "KULÜP" || typeStr === "KULUP") {
          type = LeagueType.CLUB
        } else {
          errors.push(`Satır ${i + 2}: Geçersiz lig tipi: ${typeStr}. INTRA_TEAM veya CLUB olmalı`)
          continue
        }

        // Parse category
        let category: TeamCategory
        if (categoryStr === "MALE" || categoryStr === "ERKEK" || categoryStr === "E") {
          category = TeamCategory.MALE
        } else if (categoryStr === "FEMALE" || categoryStr === "KADIN" || categoryStr === "K") {
          category = TeamCategory.FEMALE
        } else if (categoryStr === "MIXED" || categoryStr === "MIX" || categoryStr === "KARMA") {
          category = TeamCategory.MIXED
        } else {
          errors.push(`Satır ${i + 2}: Geçersiz kategori: ${categoryStr}. MALE, FEMALE veya MIXED olmalı`)
          continue
        }

        const league = await prisma.league.create({
          data: {
            name,
            type,
            category,
            season,
            managerId: session.user.id,
            status: LeagueStatus.DRAFT,
          },
        })

        created.push(league.name)
      } catch (error: any) {
        errors.push(`Satır ${i + 2}: ${error.message || "Bilinmeyen hata"}`)
      }
    }

    return NextResponse.json({
      created: created.length,
      errors: errors,
    })
  } catch (error: any) {
    console.error("Error uploading leagues:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

