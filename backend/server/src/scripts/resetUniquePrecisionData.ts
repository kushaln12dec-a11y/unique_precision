import dotenv from "dotenv";
import { prisma } from "../lib/prisma";

dotenv.config();

const resetData = async () => {
  const [jobs, logs, masters, idle, counters, captures, qaStates] = await Promise.all([
    prisma.job.deleteMany(),
    prisma.employeeLog.deleteMany(),
    prisma.masterConfig.deleteMany(),
    prisma.idleTimeConfig.deleteMany(),
    prisma.counter.deleteMany(),
    prisma.jobOperatorCapture.deleteMany(),
    prisma.jobQuantityQaState.deleteMany(),
  ]);

  console.log("Reset complete:");
  console.log(`- jobs deleted: ${jobs.count ?? 0}`);
  console.log(`- employee logs deleted: ${logs.count ?? 0}`);
  console.log(`- master configs deleted: ${masters.count ?? 0}`);
  console.log(`- idle time configs deleted: ${idle.count ?? 0}`);
  console.log(`- counters deleted: ${counters.count ?? 0}`);
  console.log(`- operator captures deleted: ${captures.count ?? 0}`);
  console.log(`- qa states deleted: ${qaStates.count ?? 0}`);
};

resetData()
  .then(() => {
    return prisma.$disconnect().then(() => process.exit(0));
  })
  .catch((error) => {
    console.error("Failed to reset data:", error);
    prisma
      .$disconnect()
      .finally(() => process.exit(1));
  });
