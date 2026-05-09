import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import pg from "pg";

// Manually load env since we are running as a standalone script
require("dotenv").config();

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL or DIRECT_URL not found in environment.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting enterprise database seeding...");

  const usersData = [
    { empId: "EMP1076", name: "MITHUN B", email: "mithunb.basur@gmail.com", role: "OPERATOR", password: "operator", phone: "7026447709" },
    { empId: "EMP1044", name: "KARAN", email: "karanrathod1234k@gmail.com", role: "OPERATOR", password: "operator", phone: "7498769335" },
    { empId: "EMP1057", name: "MANJUNATHA K P", email: "kpmanju386@gmail.com", role: "OPERATOR", password: "operator", phone: "9148184920" },
    { empId: "EMP1054", name: "ANAND S DEVARAMANI", email: "devaramanianand0@gmail.com", role: "OPERATOR", password: "operator", phone: "9353294494" },
    { empId: "EMP1028", name: "GAGAN NAIK", email: "gagarnaikgagan@gmail.com", role: "OPERATOR", password: "operator", phone: "7483720012" },
    { empId: "EMP1010", name: "UDAYA K M", email: "uday23281@gmail.com", role: "OPERATOR", password: "operator", phone: "7676691139" },
    { empId: "EMP1023", name: "BASAVARAJU A H", email: "basavarajupt@gamil.com", role: "PROGRAMMER", password: "programmer", phone: "9620667021" },
    { empId: "EMP1018", name: "PRAMOD H K", email: "hkpamod1718@gmail.com", role: "OPERATOR", password: "operator", phone: "8618345814" },
    { empId: "EMP1006", name: "THIMMESH K L", email: "thimmeshkl@gmail.com", role: "PROGRAMMER", password: "programmer", phone: "6361067148" },
    { empId: "EMP1007", name: "MANU K.C.", email: "manukumar51210@gmail.com", role: "OPERATOR", password: "operator", phone: "9148251410" },
    { empId: "EMP1019", name: "K NAVEENAKUMARA", email: "kn4567333@gmail.com", role: "OPERATOR", password: "operator", phone: "9632124376" },
    { empId: "EMP1022", name: "MERAVANIGE NANDISH", email: "nandishnandim9400@gmail.com", role: "OPERATOR", password: "operator", phone: "8147209237" },
    { empId: "EMP1042", name: "BASAVANAGOUDA", email: "basavag044@gmail.com", role: "OPERATOR", password: "operator", phone: "8722875359" },
    { empId: "EMP1033", name: "PRATHAP SONNADA MURADIMAT", email: "prathapasm235@gmail.com", role: "OPERATOR", password: "operator", phone: "6362556410" },
    { empId: "EMP1091", name: "Rakshitha B H", email: "r4207207@gmail.com", role: "QC", password: "qc", phone: "8431624930" },
    { empId: "EMP1092", name: "Darshan M", email: "dd051383@gmail.com", role: "OPERATOR", password: "operator", phone: "6360118822" },
    { empId: "EMP1093", name: "PRADEEP Meti", email: "pradeepmpradeepm57@gmail.com", role: "OPERATOR", password: "operator", phone: "6360159055" },
    { empId: "EMP1097", name: "Rudrappa Badiger", email: "brudresh54@gmail.com", role: "OPERATOR", password: "operator", phone: "8495030822" },
    { empId: "EMP1099", name: "Darshan Somalingappa Olekar", email: "darshanolekar99@gmail.com", role: "OPERATOR", password: "operator", phone: "90197 12307" },
    { empId: "EMP1100", name: "Basavaraj A", email: "basavarjbasava5847@gmail.com", role: "OPERATOR", password: "operator", phone: "96114 95498" },
    { empId: "EMP1102", name: "Chethana Kumar T", email: "EMP1102@uniqueprecision.com", role: "OPERATOR", password: "operator", phone: "9620245658" },
    { empId: "EMP1104", name: "Darshan S H", email: "shdarshand@gmail.com", role: "OPERATOR", password: "operator", phone: "9110419164" },
    { empId: "EMP1105", name: "Ranjith P", email: "EMP1105@uniqueprecision.com", role: "OPERATOR", password: "operator", phone: "98449 80855" },
    { empId: "EMP0001", name: "Raki S", email: "raki@uniqueprecision.com", role: "ADMIN", password: "admin", phone: "8904566726" },
    { empId: "EMP0002", name: "Kushal N", email: "kushaln12dec@gmail.com", role: "ADMIN", password: "admin", phone: "9632998952" },
  ];

  for (const u of usersData) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      const nameParts = u.name.split(" ");
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(" ") || null;

      await prisma.user.create({
        data: {
          empId: u.empId,
          firstName: firstName,
          lastName: lastName,
          email: u.email,
          role: u.role.toUpperCase(),
          passwordHash: hashedPassword,
          passwordText: u.password,
          phone: u.phone,
        },
      });
      console.log(`✅ Added user: ${u.name} (${u.role})`);
    } else {
      console.log(`ℹ️ User ${u.name} already exists, skipping...`);
    }
  }

  // Initialize Master Config if not exists
  const existingConfig = await prisma.masterConfig.findUnique({
    where: { key: "GLOBAL_CONFIG" },
  });

  if (!existingConfig) {
    await prisma.masterConfig.create({
      data: {
        key: "GLOBAL_CONFIG",
        settingHoursPerSetting: 1.5,
        thicknessRateUpto100: 25,
        thicknessRateAbove100: 35,
        complexExtraHours: 2,
        pipExtraHours: 3,
        customers: { create: [{ customer: "INTERNAL" }, { customer: "DEFAULT" }] },
        machineOptions: { create: [{ value: "WEDM-01" }, { value: "WEDM-02" }, { value: "SEDM-01" }] },
        materials: { create: [{ value: "Steel" }, { value: "Aluminum" }, { value: "Carbide" }] }
      },
    });
    console.log("✅ Initialized global master configuration.");
  }

  console.log("🏁 Seeding complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
