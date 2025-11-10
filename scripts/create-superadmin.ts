import { PrismaClient, UserRole, UserStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function createSuperadmin() {
  try {
    const email = "busra@btk.com"
    const password = "123321"
    const name = "Busra"

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Update existing user to superadmin
      const hashedPassword = await bcrypt.hash(password, 10)
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: UserRole.SUPERADMIN,
          status: UserStatus.APPROVED,
        },
      })

      console.log("✅ User updated to superadmin:")
      console.log(`   Email: ${updatedUser.email}`)
      console.log(`   Role: ${updatedUser.role}`)
      console.log(`   Status: ${updatedUser.status}`)
    } else {
      // Create new superadmin user
      const hashedPassword = await bcrypt.hash(password, 10)
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: UserRole.SUPERADMIN,
          status: UserStatus.APPROVED,
        },
      })

      console.log("✅ Superadmin user created:")
      console.log(`   Email: ${newUser.email}`)
      console.log(`   Name: ${newUser.name}`)
      console.log(`   Role: ${newUser.role}`)
      console.log(`   Status: ${newUser.status}`)
    }

    // Also update cagilbatuhan@gmail.com to superadmin if exists
    const cagilEmail = "cagilbatuhan@gmail.com"
    const cagilUser = await prisma.user.findUnique({
      where: { email: cagilEmail },
    })

    if (cagilUser) {
      const updatedCagil = await prisma.user.update({
        where: { email: cagilEmail },
        data: {
          role: UserRole.SUPERADMIN,
          status: UserStatus.APPROVED,
        },
      })

      console.log("\n✅ cagilbatuhan@gmail.com updated to superadmin:")
      console.log(`   Email: ${updatedCagil.email}`)
      console.log(`   Role: ${updatedCagil.role}`)
      console.log(`   Status: ${updatedCagil.status}`)
    } else {
      console.log("\n⚠️  cagilbatuhan@gmail.com not found in database.")
      console.log("   User needs to sign in with Google first, then run this script again.")
    }
  } catch (error) {
    console.error("❌ Error creating superadmin user:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createSuperadmin()

