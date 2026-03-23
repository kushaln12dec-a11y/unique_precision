import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnv } from "../config/env";

loadEnv();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const createPrismaClient = () => {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasDirectUrl = Boolean(process.env.DIRECT_URL);
  const connectionString =
    process.env.DIRECT_URL ??
    process.env.DATABASE_URL ??
    "postgresql://localhost:5432/postgres";

  if (!hasDatabaseUrl && !hasDirectUrl) {
    console.warn("DATABASE_URL/DIRECT_URL not set. Prisma will use a placeholder URL and queries will fail.");
  }

  if (!hasDirectUrl && connectionString.includes("pooler") && !connectionString.includes("pgbouncer=true")) {
    console.warn("DATABASE_URL points to a Neon pooler host but is missing 'pgbouncer=true'.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
