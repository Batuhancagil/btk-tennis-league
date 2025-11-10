import { PrismaClient, LeagueType, TeamCategory, LeagueStatus, UserRole } from "@prisma/client"

// Load environment variables if .env file exists
try {
  require("dotenv").config()
} catch (e) {
  // dotenv not available, use environment variables from system
}

const prisma = new PrismaClient()

async function createLeagues() {
  try {
    // Find a superadmin user to use as manager
    const superadmin = await prisma.user.findFirst({
      where: {
        role: UserRole.SUPERADMIN,
      },
    })

    if (!superadmin) {
      console.error("❌ No superadmin user found. Please create a superadmin first.")
      console.log("   Run: npm run create-superadmin")
      process.exit(1)
    }

    console.log(`✅ Using superadmin: ${superadmin.email} (${superadmin.name})`)
    console.log("")

    // Get current year for season
    const currentYear = new Date().getFullYear()
    const season = `${currentYear}-${currentYear + 1}`

    // Define leagues to create
    const leaguesToCreate = [
      // Men's leagues
      { name: "Erkek Birinci Lig", category: TeamCategory.MALE, type: LeagueType.CLUB },
      { name: "Erkek İkinci Lig", category: TeamCategory.MALE, type: LeagueType.CLUB },
      { name: "Erkek Üçüncü Lig", category: TeamCategory.MALE, type: LeagueType.CLUB },
      // Women's leagues
      { name: "Kadın Birinci Lig", category: TeamCategory.FEMALE, type: LeagueType.CLUB },
      { name: "Kadın İkinci Lig", category: TeamCategory.FEMALE, type: LeagueType.CLUB },
    ]

    const createdLeagues = []
    const skippedLeagues = []

    for (const leagueData of leaguesToCreate) {
      // Check if league already exists
      const existingLeague = await prisma.league.findFirst({
        where: {
          name: leagueData.name,
          season: season,
        },
      })

      if (existingLeague) {
        console.log(`⏭️  Skipping: ${leagueData.name} (already exists)`)
        skippedLeagues.push(leagueData.name)
        continue
      }

      const league = await prisma.league.create({
        data: {
          name: leagueData.name,
          type: leagueData.type,
          category: leagueData.category,
          season: season,
          managerId: superadmin.id,
          status: LeagueStatus.DRAFT,
        },
      })

      console.log(`✅ Created: ${league.name} (${league.category})`)
      createdLeagues.push(league)
    }

    console.log("")
    console.log("📊 Summary:")
    console.log(`   Created: ${createdLeagues.length} leagues`)
    console.log(`   Skipped: ${skippedLeagues.length} leagues`)
    console.log(`   Season: ${season}`)

    if (createdLeagues.length > 0) {
      console.log("")
      console.log("Created leagues:")
      createdLeagues.forEach((league) => {
        console.log(`   - ${league.name} (ID: ${league.id})`)
      })
    }
  } catch (error) {
    console.error("❌ Error creating leagues:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createLeagues()

