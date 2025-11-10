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

    if (session.user.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Dynamically import xlsx
    const XLSX = await import("xlsx")

    // Create template data
    const templateData = [
      {
        Oyuncu: "Ahmet Yılmaz",
        Email: "ahmet@example.com",
        Cinsiyet: "ERKEK",
        Seviye: "A",
      },
      {
        Oyuncu: "Ayşe Demir",
        Email: "ayse@example.com",
        Cinsiyet: "KADIN",
        Seviye: "B",
      },
    ]

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Oyuncular")

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // Return file as download
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="oyuncu-template.xlsx"',
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

