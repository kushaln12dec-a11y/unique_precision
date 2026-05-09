import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import pg from "pg";

// Manually load env since we are running as a standalone script
require("dotenv").config();

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL or DIRECT_URL not found in environment.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Create Default Admin User
  const adminEmail = "admin@unique.com";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        passwordText: "admin123",
        firstName: "System",
        lastName: "Admin",
        role: "ADMIN",
        empId: "ADMIN001",
      },
    });
    console.log("✅ Created default admin user: admin@unique.com / admin123");
  } else {
    console.log("ℹ️ Admin user already exists, skipping...");
  }

  // 2. Initialize Master Config
  const existingConfig = await prisma.masterConfig.findUnique({
    where: { key: "GLOBAL_CONFIG" },
  });

  if (!existingConfig) {
    await prisma.masterConfig.create({
      data: {
        key: "GLOBAL_CONFIG",
        settingHoursPerSetting: 1.5,
        thicknessRateUpto100: 25,
        thicknessRateAbove100: 35,
        complexExtraHours: 2,
        pipExtraHours: 3,
        customers: {
          create: [
            { customer: "INTERNAL" },
            { customer: "DEFAULT" }
          ]
        },
        machineOptions: {
          create: [
            { value: "WEDM-01" },
            { value: "WEDM-02" },
            { value: "SEDM-01" }
          ]
        },
        materials: {
          create: [
            { value: "Steel" },
            { value: "Aluminum" },
            { value: "Carbide" }
          ]
        }
      },
    });
    console.log("✅ Initialized global master configuration.");
  }

  console.log("🏁 Seeding complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
