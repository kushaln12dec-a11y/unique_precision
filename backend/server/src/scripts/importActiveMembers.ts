import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import { loadEnv } from "../config/env";
import { prisma } from "../lib/prisma";
import { normalizeEmpId } from "../utils/employeeId";

loadEnv();

type ImportRow = {
  employeeId: string;
  name: string;
  gender?: string;
  mobile?: string;
  email?: string;
  dept?: string;
};

const IMPORT_FILE = path.resolve(process.cwd(), "server/src/scripts/activeMembers1.import.json");
const DEFAULT_PASSWORD = String(process.env.USER_IMPORT_DEFAULT_PASSWORD || "raki123");
const AUTO_EMAIL_DOMAIN = "uniqueprecision.local";

const VALID_ROLES = new Set(["ADMIN", "PROGRAMMER", "OPERATOR", "QC"]);

const normalizeRole = (value: unknown): string => {
  const cleaned = String(value || "").trim().toUpperCase();
  if (VALID_ROLES.has(cleaned)) return cleaned;
  return "OPERATOR";
};

const splitName = (value: unknown): { firstName: string; lastName: string } => {
  const cleaned = String(value || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!cleaned) {
    return { firstName: "Employee", lastName: "" };
  }

  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0] ?? "Employee", lastName: "" };
  }

  return {
    firstName: parts[0] ?? "Employee",
    lastName: parts.slice(1).join(" "),
  };
};

const normalizePhone = (value: unknown): string => String(value || "").replace(/\D+/g, "");

const normalizeEmail = (value: unknown): string => String(value || "").trim().toLowerCase();

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const buildAutoEmail = async (empId: string, excludeUserId?: string): Promise<string> => {
  const base = `${empId.toLowerCase()}@${AUTO_EMAIL_DOMAIN}`;
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.user.findFirst({
      where: {
        email: candidate,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return candidate;

    suffix += 1;
    candidate = `${empId.toLowerCase()}+${suffix}@${AUTO_EMAIL_DOMAIN}`;
  }
};

const resolveEmail = async (email: string, empId: string, excludeUserId?: string): Promise<string> => {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return buildAutoEmail(empId, excludeUserId);
  }

  const existing = await prisma.user.findFirst({
    where: {
      email: normalized,
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  if (!existing) return normalized;
  return buildAutoEmail(empId, excludeUserId);
};

const readRows = (): ImportRow[] => {
  const raw = fs.readFileSync(IMPORT_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
};

const importUsers = async () => {
  const rows = readRows();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const empId = normalizeEmpId(row.employeeId);
    if (!empId) {
      skipped += 1;
      console.warn("Skipping row without valid Employee ID:", row);
      continue;
    }

    const { firstName, lastName } = splitName(row.name);
    const phone = normalizePhone(row.mobile);
    const role = normalizeRole(row.dept);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { empId },
          ...(normalizeEmail(row.email) ? [{ email: normalizeEmail(row.email) }] : []),
        ],
      },
    });

    const email = await resolveEmail(row.email || "", empId, existing?.id);

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          empId,
          email,
          firstName,
          lastName,
          phone,
          role,
        },
      });
      updated += 1;
      continue;
    }

    await prisma.user.create({
      data: {
        empId,
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role,
        image: "",
      },
    });
    created += 1;
  }

  console.log(
    JSON.stringify(
      {
        source: path.basename(IMPORT_FILE),
        totalRows: rows.length,
        created,
        updated,
        skipped,
        defaultPasswordUsed: DEFAULT_PASSWORD,
        appEnv: process.env.APP_ENV || "development",
      },
      null,
      2
    )
  );
};

importUsers()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Failed to import active members:", error);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  });
