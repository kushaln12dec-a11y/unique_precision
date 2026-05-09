-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordText" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "empId" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "groupId" BIGINT NOT NULL,
    "customer" TEXT,
    "rate" DECIMAL(12,2),
    "cut" DECIMAL(12,4),
    "thickness" DECIMAL(12,4),
    "passLevel" TEXT,
    "setting" TEXT,
    "qty" INTEGER,
    "sedm" TEXT DEFAULT 'No',
    "sedmSelectionType" TEXT,
    "sedmRangeKey" TEXT,
    "sedmStandardValue" TEXT,
    "sedmLengthType" TEXT,
    "sedmOver20Length" DECIMAL(12,4),
    "sedmLengthValue" DECIMAL(12,4),
    "sedmHoles" INTEGER,
    "sedmEntriesJson" TEXT,
    "operationRowsJson" TEXT,
    "material" TEXT,
    "priority" TEXT,
    "description" TEXT,
    "remark" TEXT,
    "programRefFile" TEXT,
    "cutImage" TEXT,
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "pipFinish" BOOLEAN NOT NULL DEFAULT false,
    "totalHrs" DECIMAL(12,2),
    "totalAmount" DECIMAL(12,2),
    "wedmAmount" DECIMAL(12,2),
    "sedmAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "qcReportClosed" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "createdByUserId" UUID,
    "assignedToUserId" UUID,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobOperatorCapture" (
    "id" UUID NOT NULL,
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
    "employeeLogId" UUID,

    CONSTRAINT "JobOperatorCapture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobQuantityQaState" (
    "jobId" UUID NOT NULL,
    "quantityNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "JobQuantityQaState_pkey" PRIMARY KEY ("jobId","quantityNumber")
);

-- CreateTable
CREATE TABLE "EmployeeLog" (
    "id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userId" UUID,
    "userEmail" TEXT,
    "userName" TEXT,
    "jobId" UUID,
    "jobGroupId" BIGINT,
    "refNumber" TEXT,
    "settingLabel" TEXT,
    "quantityFrom" INTEGER,
    "quantityTo" INTEGER,
    "quantityCount" INTEGER,
    "jobCustomer" TEXT,
    "jobDescription" TEXT,
    "workItemTitle" TEXT,
    "workSummary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterConfig" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'global',
    "settingHoursPerSetting" DECIMAL(10,2),
    "thicknessRateUpto100" DECIMAL(12,2),
    "thicknessRateAbove100" DECIMAL(12,2),
    "complexExtraHours" DECIMAL(10,2),
    "pipExtraHours" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterConfigCustomer" (
    "id" UUID NOT NULL,
    "masterConfigId" UUID NOT NULL,
    "customer" TEXT NOT NULL,
    "rate" DECIMAL(12,2),
    "settingHours" DECIMAL(10,2),
    "thicknessRateUpto100" DECIMAL(12,2),
    "thicknessRateAbove100" DECIMAL(12,2),
    "sedm034Min" DECIMAL(12,2),
    "sedm034PerMm" DECIMAL(12,2),
    "sedm056Min" DECIMAL(12,2),
    "sedm056PerMm" DECIMAL(12,2),
    "sedm07Min" DECIMAL(12,2),
    "sedm07PerMm" DECIMAL(12,2),
    "sedm0812Min" DECIMAL(12,2),
    "sedm0812PerMm" DECIMAL(12,2),
    "sedm1520Min" DECIMAL(12,2),
    "sedm1520PerMm" DECIMAL(12,2),
    "sedm2225Min" DECIMAL(12,2),
    "sedm2225PerMm" DECIMAL(12,2),
    "sedm30Min" DECIMAL(12,2),
    "sedm30PerMm" DECIMAL(12,2),

    CONSTRAINT "MasterConfigCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterConfigMaterial" (
    "id" UUID NOT NULL,
    "masterConfigId" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "MasterConfigMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterConfigPassOption" (
    "id" UUID NOT NULL,
    "masterConfigId" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "MasterConfigPassOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterConfigSedmElectrodeOption" (
    "id" UUID NOT NULL,
    "masterConfigId" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "MasterConfigSedmElectrodeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterConfigMachineOption" (
    "id" UUID NOT NULL,
    "masterConfigId" UUID NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "MasterConfigMachineOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterConfigSedmThOption" (
    "id" UUID NOT NULL,
    "masterConfigId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "MasterConfigSedmThOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdleTimeConfig" (
    "id" UUID NOT NULL,
    "idleTimeType" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdleTimeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemErrorLog" (
    "id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "code" TEXT,
    "method" TEXT,
    "url" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_empId_key" ON "User"("empId");

-- CreateIndex
CREATE INDEX "Job_groupId_idx" ON "Job"("groupId");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- CreateIndex
CREATE INDEX "Job_groupId_createdAt_idx" ON "Job"("groupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Job_customer_idx" ON "Job"("customer");

-- CreateIndex
CREATE INDEX "Job_description_idx" ON "Job"("description");

-- CreateIndex
CREATE INDEX "Job_createdBy_idx" ON "Job"("createdBy");

-- CreateIndex
CREATE INDEX "Job_assignedTo_idx" ON "Job"("assignedTo");

-- CreateIndex
CREATE INDEX "Job_priority_idx" ON "Job"("priority");

-- CreateIndex
CREATE INDEX "Job_sedm_idx" ON "Job"("sedm");

-- CreateIndex
CREATE INDEX "Job_critical_idx" ON "Job"("critical");

-- CreateIndex
CREATE INDEX "Job_pipFinish_idx" ON "Job"("pipFinish");

-- CreateIndex
CREATE INDEX "JobOperatorCapture_jobId_idx" ON "JobOperatorCapture"("jobId");

-- CreateIndex
CREATE INDEX "JobQuantityQaState_status_idx" ON "JobQuantityQaState"("status");

-- CreateIndex
CREATE INDEX "EmployeeLog_role_idx" ON "EmployeeLog"("role");

-- CreateIndex
CREATE INDEX "EmployeeLog_activityType_idx" ON "EmployeeLog"("activityType");

-- CreateIndex
CREATE INDEX "EmployeeLog_status_idx" ON "EmployeeLog"("status");

-- CreateIndex
CREATE INDEX "EmployeeLog_userId_idx" ON "EmployeeLog"("userId");

-- CreateIndex
CREATE INDEX "EmployeeLog_userEmail_idx" ON "EmployeeLog"("userEmail");

-- CreateIndex
CREATE INDEX "EmployeeLog_userName_idx" ON "EmployeeLog"("userName");

-- CreateIndex
CREATE INDEX "EmployeeLog_jobGroupId_idx" ON "EmployeeLog"("jobGroupId");

-- CreateIndex
CREATE INDEX "EmployeeLog_jobId_idx" ON "EmployeeLog"("jobId");

-- CreateIndex
CREATE INDEX "EmployeeLog_refNumber_idx" ON "EmployeeLog"("refNumber");

-- CreateIndex
CREATE INDEX "EmployeeLog_quantityCount_idx" ON "EmployeeLog"("quantityCount");

-- CreateIndex
CREATE INDEX "EmployeeLog_jobCustomer_idx" ON "EmployeeLog"("jobCustomer");

-- CreateIndex
CREATE INDEX "EmployeeLog_workItemTitle_idx" ON "EmployeeLog"("workItemTitle");

-- CreateIndex
CREATE INDEX "EmployeeLog_startedAt_idx" ON "EmployeeLog"("startedAt");

-- CreateIndex
CREATE INDEX "EmployeeLog_durationSeconds_idx" ON "EmployeeLog"("durationSeconds");

-- CreateIndex
CREATE UNIQUE INDEX "MasterConfig_key_key" ON "MasterConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "MasterConfigCustomer_masterConfigId_customer_key" ON "MasterConfigCustomer"("masterConfigId", "customer");

-- CreateIndex
CREATE UNIQUE INDEX "MasterConfigMaterial_masterConfigId_value_key" ON "MasterConfigMaterial"("masterConfigId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "MasterConfigPassOption_masterConfigId_value_key" ON "MasterConfigPassOption"("masterConfigId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "MasterConfigSedmElectrodeOption_masterConfigId_value_key" ON "MasterConfigSedmElectrodeOption"("masterConfigId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "MasterConfigMachineOption_masterConfigId_value_key" ON "MasterConfigMachineOption"("masterConfigId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "MasterConfigSedmThOption_masterConfigId_value_key" ON "MasterConfigSedmThOption"("masterConfigId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "IdleTimeConfig_idleTimeType_key" ON "IdleTimeConfig"("idleTimeType");

-- CreateIndex
CREATE UNIQUE INDEX "Counter_key_key" ON "Counter"("key");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOperatorCapture" ADD CONSTRAINT "JobOperatorCapture_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobQuantityQaState" ADD CONSTRAINT "JobQuantityQaState_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLog" ADD CONSTRAINT "EmployeeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLog" ADD CONSTRAINT "EmployeeLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterConfigCustomer" ADD CONSTRAINT "MasterConfigCustomer_masterConfigId_fkey" FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterConfigMaterial" ADD CONSTRAINT "MasterConfigMaterial_masterConfigId_fkey" FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterConfigPassOption" ADD CONSTRAINT "MasterConfigPassOption_masterConfigId_fkey" FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterConfigSedmElectrodeOption" ADD CONSTRAINT "MasterConfigSedmElectrodeOption_masterConfigId_fkey" FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterConfigMachineOption" ADD CONSTRAINT "MasterConfigMachineOption_masterConfigId_fkey" FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterConfigSedmThOption" ADD CONSTRAINT "MasterConfigSedmThOption_masterConfigId_fkey" FOREIGN KEY ("masterConfigId") REFERENCES "MasterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
