import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";

const schemaStatements: string[] = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,

  `CREATE TABLE IF NOT EXISTS "User" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "empId" TEXT UNIQUE,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,

  `CREATE TABLE IF NOT EXISTS "Job" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "groupId" INTEGER NOT NULL,
    "customer" TEXT,
    "rate" NUMERIC(12, 2),
    "cut" NUMERIC(12, 4),
    "thickness" NUMERIC(12, 4),
    "passLevel" TEXT,
    "setting" TEXT,
    "qty" INTEGER,
    "sedm" TEXT DEFAULT 'No',
    "sedmSelectionType" TEXT,
    "sedmRangeKey" TEXT,
    "sedmStandardValue" TEXT,
    "sedmLengthType" TEXT,
    "sedmOver20Length" NUMERIC(12, 4),
    "sedmLengthValue" NUMERIC(12, 4),
    "sedmHoles" INTEGER,
    "sedmEntriesJson" TEXT,
    "operationRowsJson" TEXT,
    "material" TEXT,
    "priority" TEXT,
    "description" TEXT,
    "programRefFile" TEXT,
    "cutImage" TEXT,
    "critical" BOOLEAN NOT NULL DEFAULT FALSE,
    "pipFinish" BOOLEAN NOT NULL DEFAULT FALSE,
    "totalHrs" NUMERIC(12, 2),
    "totalAmount" NUMERIC(12, 2),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT DEFAULT 'Unassigned',
    "refNumber" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "machineHrs" TEXT,
    "machineNumber" TEXT,
    "opsName" TEXT,
    "idleTime" TEXT,
    "idleTimeDuration" TEXT,
    "lastImage" TEXT,
    "qcDecision" TEXT NOT NULL DEFAULT 'PENDING',
    "qcReportClosed" BOOLEAN NOT NULL DEFAULT FALSE,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMPTZ,
    "createdByUserId" UUID,
    "assignedToUserId" UUID,
    CONSTRAINT "Job_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL,
    CONSTRAINT "Job_assignedToUserId_fkey"
      FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL
  );`,

  `CREATE TABLE IF NOT EXISTS "JobOperatorCapture" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL,
    "captureMode" TEXT NOT NULL,
    "fromQty" INTEGER NOT NULL,
    "toQty" INTEGER NOT NULL,
    "quantityCount" INTEGER NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "machineHrs" TEXT,
    "machineNumber" TEXT,
    "opsName" TEXT,
    "idleTime" TEXT,
    "idleTimeDuration" TEXT,
    "lastImage" TEXT,
    "createdAt" TEXT,
    "createdBy" TEXT,
    CONSTRAINT "JobOperatorCapture_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "JobQuantityQaState" (
    "jobId" UUID NOT NULL,
    "quantityNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "JobQuantityQaState_pkey" PRIMARY KEY ("jobId", "quantityNumber"),
    CONSTRAINT "JobQuantityQaState_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "EmployeeLog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "role" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userId" UUID,
    "userEmail" TEXT,
    "userName" TEXT,
    "jobId" UUID,
    "jobGroupId" INTEGER,
    "refNumber" TEXT,
    "settingLabel" TEXT,
    "quantityFrom" INTEGER,
    "quantityTo" INTEGER,
    "quantityCount" INTEGER,
    "jobCustomer" TEXT,
    "jobDescription" TEXT,
    "workItemTitle" TEXT,
    "workSummary" TEXT,
    "startedAt" TIMESTAMPTZ NOT NULL,
    "endedAt" TIMESTAMPTZ,
    "durationSeconds" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "EmployeeLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
    CONSTRAINT "EmployeeLog_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL
  );`,

  `CREATE TABLE IF NOT EXISTS "MasterConfig" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL UNIQUE DEFAULT 'global',
    "settingHoursPerSetting" NUMERIC(10, 2),
    "complexExtraHours" NUMERIC(10, 2),
    "pipExtraHours" NUMERIC(10, 2),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,

  `CREATE TABLE IF NOT EXISTS "MasterConfigCustomer" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "masterConfigId" UUID NOT NULL,
    "customer" TEXT NOT NULL,
    "rate" NUMERIC(12, 2),
    CONSTRAINT "MasterConfigCustomer_masterConfigId_fkey"
      FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE,
    CONSTRAINT "MasterConfigCustomer_unique" UNIQUE ("masterConfigId", "customer")
  );`,

  `CREATE TABLE IF NOT EXISTS "MasterConfigMaterial" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "masterConfigId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "MasterConfigMaterial_masterConfigId_fkey"
      FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE,
    CONSTRAINT "MasterConfigMaterial_unique" UNIQUE ("masterConfigId", "value")
  );`,

  `CREATE TABLE IF NOT EXISTS "MasterConfigPassOption" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "masterConfigId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "MasterConfigPassOption_masterConfigId_fkey"
      FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE,
    CONSTRAINT "MasterConfigPassOption_unique" UNIQUE ("masterConfigId", "value")
  );`,

  `CREATE TABLE IF NOT EXISTS "MasterConfigSedmElectrodeOption" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "masterConfigId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "MasterConfigSedmElectrodeOption_masterConfigId_fkey"
      FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE,
    CONSTRAINT "MasterConfigSedmElectrodeOption_unique" UNIQUE ("masterConfigId", "value")
  );`,

  `CREATE TABLE IF NOT EXISTS "MasterConfigMachineOption" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "masterConfigId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "MasterConfigMachineOption_masterConfigId_fkey"
      FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE,
    CONSTRAINT "MasterConfigMachineOption_unique" UNIQUE ("masterConfigId", "value")
  );`,

  `CREATE TABLE IF NOT EXISTS "MasterConfigSedmThOption" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "masterConfigId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "MasterConfigSedmThOption_masterConfigId_fkey"
      FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE,
    CONSTRAINT "MasterConfigSedmThOption_unique" UNIQUE ("masterConfigId", "value")
  );`,

  `CREATE TABLE IF NOT EXISTS "IdleTimeConfig" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "idleTimeType" TEXT NOT NULL UNIQUE,
    "durationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,

  `CREATE TABLE IF NOT EXISTS "Counter" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL UNIQUE,
    "seq" INTEGER NOT NULL DEFAULT 0
  );`,

  `CREATE INDEX IF NOT EXISTS "Job_groupId_idx" ON "Job" ("groupId");`,
  `CREATE INDEX IF NOT EXISTS "Job_createdAt_idx" ON "Job" ("createdAt");`,
  `CREATE INDEX IF NOT EXISTS "Job_customer_idx" ON "Job" ("customer");`,
  `CREATE INDEX IF NOT EXISTS "Job_description_idx" ON "Job" ("description");`,
  `CREATE INDEX IF NOT EXISTS "Job_createdBy_idx" ON "Job" ("createdBy");`,
  `CREATE INDEX IF NOT EXISTS "Job_assignedTo_idx" ON "Job" ("assignedTo");`,
  `CREATE INDEX IF NOT EXISTS "Job_priority_idx" ON "Job" ("priority");`,
  `CREATE INDEX IF NOT EXISTS "Job_sedm_idx" ON "Job" ("sedm");`,
  `CREATE INDEX IF NOT EXISTS "Job_critical_idx" ON "Job" ("critical");`,
  `CREATE INDEX IF NOT EXISTS "Job_pipFinish_idx" ON "Job" ("pipFinish");`,
  `CREATE INDEX IF NOT EXISTS "JobOperatorCapture_jobId_idx" ON "JobOperatorCapture" ("jobId");`,
  `CREATE INDEX IF NOT EXISTS "JobQuantityQaState_status_idx" ON "JobQuantityQaState" ("status");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_role_idx" ON "EmployeeLog" ("role");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_activityType_idx" ON "EmployeeLog" ("activityType");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_status_idx" ON "EmployeeLog" ("status");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_userId_idx" ON "EmployeeLog" ("userId");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_userEmail_idx" ON "EmployeeLog" ("userEmail");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_userName_idx" ON "EmployeeLog" ("userName");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_jobGroupId_idx" ON "EmployeeLog" ("jobGroupId");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_jobId_idx" ON "EmployeeLog" ("jobId");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_refNumber_idx" ON "EmployeeLog" ("refNumber");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_quantityCount_idx" ON "EmployeeLog" ("quantityCount");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_jobCustomer_idx" ON "EmployeeLog" ("jobCustomer");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_workItemTitle_idx" ON "EmployeeLog" ("workItemTitle");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_startedAt_idx" ON "EmployeeLog" ("startedAt");`,
  `CREATE INDEX IF NOT EXISTS "EmployeeLog_durationSeconds_idx" ON "EmployeeLog" ("durationSeconds");`,
];

export const initDB = async (): Promise<void> => {
  console.log("Initializing database schema...");

  try {
    for (const statement of schemaStatements) {
      await prisma.$executeRawUnsafe(statement);
    }
    console.log("Database schema ensured.");
  } catch (error) {
    console.error("Database schema initialization failed:", error);
    return;
  }

  try {
    const passwordHash = await bcrypt.hash("raki123", 10);
    await prisma.$executeRaw`
      INSERT INTO "User" ("email", "passwordHash", "role", "createdAt", "updatedAt")
      VALUES (${`rakis@gmail.com`}, ${passwordHash}, ${"ADMIN"}, NOW(), NOW())
      ON CONFLICT ("email") DO NOTHING;
    `;
    console.log("Default admin ensured.");
  } catch (error) {
    console.error("Failed to insert default admin user:", error);
  }
};
