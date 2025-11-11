import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Dynamically import xlsx
    const XLSX = await import("xlsx")

    // Create template data
    const templateData = [
      {
        "Lig Adı": "2024-2025 Erkek Takım İçi Ligi",
        "Lig Tipi": "INTRA_TEAM",
        "Kategori": "MALE",
        "Sezon": "2024-2025",
      },
      {
        "Lig Adı": "2024-2025 Kadın Kulüp Ligi",
        "Lig Tipi": "CLUB",
        "Kategori": "FEMALE",
        "Sezon": "2024-2025",
      },
    ]

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ligler")

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // Return file as download
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="lig-template.xlsx"',
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

