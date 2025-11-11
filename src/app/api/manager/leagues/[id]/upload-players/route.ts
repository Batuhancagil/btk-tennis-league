import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeagueFormat } from "@prisma/client"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const league = await prisma.league.findUnique({
      where: { id: params.id },
    })

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 })
    }

    if (league.managerId !== session.user.id && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (league.format !== LeagueFormat.INDIVIDUAL) {
      return NextResponse.json(
        { error: "Players can only be uploaded to individual leagues" },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Dynamically import xlsx
    const XLSX = await import("xlsx")
    
    const fileName = file.name.toLowerCase()
    const isCSV = fileName.endsWith('.csv')
    
    let workbook: any
    
    if (isCSV) {
      const arrayBuffer = await file.arrayBuffer()
      let text = new TextDecoder('utf-8').decode(arrayBuffer)
      
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1)
      }
      
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
    
    // Read headers - expect Email or Oyuncu/Name
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
        
        if (headerNormalized === 'email' || headerNormalized === 'e-posta') {
          headers['email'] = C
        } else if (headerNormalized === 'oyuncu' || headerNormalized === 'isim' || headerNormalized === 'name') {
          headers['name'] = C
        }
      }
    }
    
    // Read data rows
    const data: any[] = []
    for (let R = 1; R <= range.e.r; ++R) {
      const row: any = {}
      if (headers['email'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['email'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          row.email = cell.w ? String(cell.w) : (cell.v ? String(cell.v) : '')
        }
      }
      if (headers['name'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['name'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          row.name = cell.w ? String(cell.w) : (cell.v ? String(cell.v) : '')
        }
      }
      
      if (row.email || row.name) {
        data.push(row)
      }
    }

    const created = []
    const errors = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      try {
        const email = (row.email || "").trim()
        const name = (row.name || "").trim()

        if (!email && !name) {
          errors.push(`Satır ${i + 2}: Email veya oyuncu adı gereklidir`)
          continue
        }

        // Find player by email or name
        let player
        if (email) {
          player = await prisma.user.findUnique({
            where: { email },
          })
        } else if (name) {
          player = await prisma.user.findFirst({
            where: { name },
          })
        }

        if (!player) {
          errors.push(`Satır ${i + 2}: Oyuncu bulunamadı: ${email || name}`)
          continue
        }

        // Check if player is approved
        if (player.status !== "APPROVED") {
          errors.push(`Satır ${i + 2}: Oyuncu onaylanmamış: ${player.name}`)
          continue
        }

        // Validate gender compatibility
        if (league.category === "MALE" && player.gender !== "MALE") {
          errors.push(`Satır ${i + 2}: Erkek ligine sadece erkek oyuncular eklenebilir: ${player.name}`)
          continue
        }

        if (league.category === "FEMALE" && player.gender !== "FEMALE") {
          errors.push(`Satır ${i + 2}: Kadın ligine sadece kadın oyuncular eklenebilir: ${player.name}`)
          continue
        }

        // Check if player is already in league
        const existingMember = await prisma.leaguePlayer.findUnique({
          where: {
            leagueId_playerId: {
              leagueId: params.id,
              playerId: player.id,
            },
          },
        })

        if (existingMember) {
          errors.push(`Satır ${i + 2}: Oyuncu zaten ligde: ${player.name}`)
          continue
        }

        await prisma.leaguePlayer.create({
          data: {
            leagueId: params.id,
            playerId: player.id,
          },
        })

        created.push(player.name)
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

