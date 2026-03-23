import { loadEnv } from "../config/env";
import { prisma } from "../lib/prisma";

loadEnv();

const seedIdleTimeConfigs = async () => {
  try {
    const configs = [
      { idleTimeType: "Power Break", durationMinutes: 0 },
      { idleTimeType: "Machine Breakdown", durationMinutes: 0 },
      { idleTimeType: "Vertical Dial", durationMinutes: 20 },
      { idleTimeType: "Cleaning", durationMinutes: 0 },
      { idleTimeType: "Consumables Change", durationMinutes: 0 },
    ];

    for (const config of configs) {
      await prisma.idleTimeConfig.upsert({
        where: { idleTimeType: config.idleTimeType },
        update: { durationMinutes: config.durationMinutes },
        create: config,
      });
      console.log(
        `✓ Seeded/Updated idle time config: ${config.idleTimeType} = ${config.durationMinutes} minutes`
      );
    }

    console.log("\n✓ All idle time configurations seeded successfully!");
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding idle time configs:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

seedIdleTimeConfigs();
