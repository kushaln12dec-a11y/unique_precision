import { prisma } from "../lib/prisma";

export const connectDB = async (): Promise<boolean> => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Configure it in your environment variables.");
    return false;
  }
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected");
    return true;
  } catch (error) {
    console.error("PostgreSQL connection error:", error);
    return false;
  }
};
