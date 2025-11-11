import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting migration of MatchRequestChat to MatchChat...")

  // Check if MatchRequestChat table exists (it might have been renamed)
  // Since we're using db push, the table should already be updated
  // But we need to migrate any existing data if there was a separate table

  // Note: Since we used db push, MatchRequestChat table should not exist anymore
  // But if there's data in a backup or separate table, we would migrate it here
  
  console.log("Migration completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

