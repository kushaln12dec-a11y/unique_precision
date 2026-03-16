import bcrypt from "bcrypt";
import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";

export const ensureEnv = () => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-secret";
  }
  process.env.NODE_ENV = "test";
};

export const resetDb = async () => {
  await prisma.$transaction([
    prisma.jobOperatorCapture.deleteMany(),
    prisma.jobQuantityQaState.deleteMany(),
    prisma.employeeLog.deleteMany(),
    prisma.job.deleteMany(),
    prisma.masterConfigCustomer.deleteMany(),
    prisma.masterConfigMaterial.deleteMany(),
    prisma.masterConfigPassOption.deleteMany(),
    prisma.masterConfigSedmElectrodeOption.deleteMany(),
    prisma.masterConfigMachineOption.deleteMany(),
    prisma.masterConfigSedmThOption.deleteMany(),
    prisma.masterConfig.deleteMany(),
    prisma.idleTimeConfig.deleteMany(),
    prisma.counter.deleteMany(),
    prisma.user.deleteMany(),
  ]);
};

export const createAdminAndLogin = async () => {
  const email = "admin@example.com";
  const password = "Test1234!";
  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashed,
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
    },
    create: {
      email,
      passwordHash: hashed,
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
    },
  });

  const res = await request(app).post("/api/auth/login").send({ email, password });
  if (!res.body?.token) {
    throw new Error("Failed to obtain auth token in tests.");
  }
  return res.body.token as string;
};
