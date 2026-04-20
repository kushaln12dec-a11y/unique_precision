import { loadEnv } from "../config/env";
import { prisma } from "../lib/prisma";

loadEnv();

const resetData = async () => {
  // First, get the user EMP0001 to preserve
  const preservedUser = await prisma.user.findUnique({
    where: { empId: 'EMP0001' },
  });

  if (!preservedUser) {
    console.error('Error: User EMP0001 (Raki S) not found. Cannot proceed with reset.');
    throw new Error('Preserved user EMP0001 not found');
  }

  const fullName = `${preservedUser.firstName || ''} ${preservedUser.lastName || ''}`.trim() || preservedUser.email;
  console.log(`Preserving user: ${fullName} (${preservedUser.empId})`);

  // Delete all users except EMP0001
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      empId: {
        not: 'EMP0001'
      }
    }
  });

  // Delete all other data
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
  console.log(`- users deleted: ${deletedUsers.count ?? 0} (EMP0001 preserved)`);
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
