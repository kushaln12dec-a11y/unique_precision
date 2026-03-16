import { prisma } from "../lib/prisma";

export const connectDB = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Configure it in your environment variables.");
    process.exit(1);
  }
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected");
  } catch (error) {
    console.error("PostgreSQL connection error:", error);
    process.exit(1);
  }
};
