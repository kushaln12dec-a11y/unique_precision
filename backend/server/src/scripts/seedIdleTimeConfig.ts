import mongoose from "mongoose";
import dotenv from "dotenv";
import IdleTimeConfig from "../models/IdleTimeConfig";
import { connectDB } from "../config/database";

dotenv.config();

const seedIdleTimeConfigs = async () => {
  try {
    await connectDB();

    const configs = [
      { idleTimeType: "Power Break", durationMinutes: 0 },
      { idleTimeType: "Machine Breakdown", durationMinutes: 0 },
      { idleTimeType: "Vertical Dial", durationMinutes: 20 },
      { idleTimeType: "Cleaning", durationMinutes: 0 },
      { idleTimeType: "Consumables Change", durationMinutes: 0 },
    ];

    for (const config of configs) {
      await IdleTimeConfig.findOneAndUpdate(
        { idleTimeType: config.idleTimeType },
        config,
        { upsert: true, new: true }
      );
      console.log(`✓ Seeded/Updated idle time config: ${config.idleTimeType} = ${config.durationMinutes} minutes`);
    }

    console.log("\n✓ All idle time configurations seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding idle time configs:", error);
    process.exit(1);
  }
};

seedIdleTimeConfigs();
