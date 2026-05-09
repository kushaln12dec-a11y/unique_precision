import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = Router();

const parseConnectionFingerprint = () => {
  const rawConnectionString =
    String(process.env.DIRECT_URL || "").trim() ||
    String(process.env.DATABASE_URL || "").trim();

  if (!rawConnectionString) {
    return {
      configured: false,
      host: null,
      databaseFromUrl: null,
      usesPooler: false,
      hasPgbouncerFlag: false,
    };
  }

  try {
    const parsed = new URL(rawConnectionString);
    const host = parsed.hostname || null;
    const databaseFromUrl = parsed.pathname.replace(/^\/+/, "") || null;

    return {
      configured: true,
      host,
      databaseFromUrl,
      usesPooler: host?.includes("pooler") ?? false,
      hasPgbouncerFlag: parsed.searchParams.get("pgbouncer") === "true",
    };
  } catch {
    return {
      configured: true,
      host: "unparseable",
      databaseFromUrl: null,
      usesPooler: false,
      hasPgbouncerFlag: false,
    };
  }
};

router.use(authMiddleware, adminMiddleware);

router.get("/db", async (_req, res) => {
  const debugEnabled = String(process.env.ENABLE_DB_DEBUG_ENDPOINT || "").trim().toLowerCase() === "true";
  if (!debugEnabled) {
    return res.status(404).json({ message: "Not found" });
  }

  try {
    const [userCount, dbMetaRows] = await Promise.all([
      prisma.user.count(),
      prisma.$queryRawUnsafe<Array<{ current_database: string; current_schema: string }>>(
        'SELECT current_database(), current_schema()'
      ),
    ]);

    const dbMeta = dbMetaRows[0];
    return res.json({
      userCount,
      currentDatabase: dbMeta?.current_database ?? null,
      currentSchema: dbMeta?.current_schema ?? null,
      connection: parseConnectionFingerprint(),
      appEnv: process.env.APP_ENV || process.env.NODE_ENV || "development",
    });
  } catch (error) {
    console.error("DB debug route failed:", error);
    return res.status(500).json({ message: "Error reading database debug info" });
  }
});

export default router;
