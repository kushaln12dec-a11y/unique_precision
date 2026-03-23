import { loadEnv } from "../config/env";
import { prisma } from "../lib/prisma";

loadEnv();

const ADMIN_EMAIL = "kushal12dec@gmail.com";
const ADMIN_PASSWORD_HASH = "$2b$10$1Tt46NEctpQp3St5R5rmFuWM2ZwhY3rnf7p0v3cf.JcA5gSOA03BW";

const ADMIN_PAYLOAD = {
  email: ADMIN_EMAIL,
  passwordHash: ADMIN_PASSWORD_HASH,
  firstName: "Kushal",
  lastName: "N",
  phone: "9632998952",
  empId: "EMP001",
  role: "ADMIN",
  image: ""
};

const seedAdmin = async () => {
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: ADMIN_PAYLOAD,
    create: ADMIN_PAYLOAD,
  });

  console.log("Admin user ensured:", user.email);
};

seedAdmin()
  .then(() => prisma.$disconnect().then(() => process.exit(0)))
  .catch((error) => {
    console.error("Failed to seed admin user:", error);
    prisma
      .$disconnect()
      .finally(() => process.exit(1));
  });
