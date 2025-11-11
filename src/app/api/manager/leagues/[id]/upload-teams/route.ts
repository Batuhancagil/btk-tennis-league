import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeagueFormat, TeamCategory } from "@prisma/client"

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

    if (league.format !== LeagueFormat.DOUBLES) {
      return NextResponse.json(
        { error: "Teams can only be uploaded to doubles leagues" },
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
        
        if (headerNormalized === 'takım adı' || headerNormalized === 'takim adi' || headerNormalized === 'name' || headerText.toLowerCase() === 'name') {
          headers['name'] = C
        } else if (headerNormalized === 'kategori' || headerNormalized === 'category' || headerText.toLowerCase() === 'category') {
          headers['category'] = C
        } else if (headerNormalized === 'maksimum oyuncu' || headerNormalized === 'max oyuncu' || headerNormalized === 'maxplayers' || headerNormalized === 'max players') {
          headers['maxPlayers'] = C
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
      if (headers['category'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['category'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          row.category = cell.w ? String(cell.w) : (cell.v ? String(cell.v) : '')
        }
      }
      if (headers['maxPlayers'] !== undefined) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: headers['maxPlayers'] })
        const cell = worksheet[cellAddress]
        if (cell) {
          row.maxPlayers = cell.v !== undefined ? cell.v : (cell.w ? parseInt(cell.w) : null)
        }
      }
      
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
        const categoryStr = (row.category || "").trim().toUpperCase()

        if (!name) {
          errors.push(`Satır ${i + 2}: Takım adı gereklidir`)
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
          category = league.category // Default to league category
        }

        if (category !== league.category) {
          errors.push(`Satır ${i + 2}: Takım kategorisi lig kategorisi ile eşleşmiyor`)
          continue
        }

        // Parse maxPlayers
        let maxPlayersValue: number | null = null
        if (row.maxPlayers !== undefined && row.maxPlayers !== null) {
          const parsed = parseInt(String(row.maxPlayers))
          if (!isNaN(parsed) && parsed > 0) {
            maxPlayersValue = parsed
          }
        }

        // Create team and add to league
        const team = await prisma.team.create({
          data: {
            name,
            category,
            maxPlayers: maxPlayersValue,
            captainId: session.user.id, // Manager becomes captain for imported teams
            leagueId: params.id,
          },
        })

        created.push(team.name)
      } catch (error: any) {
        errors.push(`Satır ${i + 2}: ${error.message || "Bilinmeyen hata"}`)
      }
    }

    return NextResponse.json({
      created: created.length,
      errors: errors,
    })
  } catch (error: any) {
    console.error("Error uploading teams:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

