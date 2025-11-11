import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeagueFormat } from "@prisma/client"

export async function GET(
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

    // Dynamically import xlsx
    const XLSX = await import("xlsx")

    let templateData: any[]
    let filename: string

    if (league.format === LeagueFormat.DOUBLES) {
      // Template for teams
      templateData = [
        {
          "Takım Adı": "Takım 1",
          "Kategori": league.category,
          "Maksimum Oyuncu": 10,
        },
        {
          "Takım Adı": "Takım 2",
          "Kategori": league.category,
          "Maksimum Oyuncu": 12,
        },
      ]
      filename = "takim-template.xlsx"
    } else {
      // Template for players
      templateData = [
        {
          "Email": "oyuncu1@example.com",
          "Oyuncu": "Ahmet Yılmaz",
        },
        {
          "Email": "oyuncu2@example.com",
          "Oyuncu": "Ayşe Demir",
        },
      ]
      filename = "oyuncu-template.xlsx"
    }

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, league.format === LeagueFormat.DOUBLES ? "Takımlar" : "Oyuncular")

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // Return file as download
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error("Error generating template:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

