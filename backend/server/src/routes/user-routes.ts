import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { mapUser } from "../utils/prismaMappers";
import { resolveStoredFile } from "../utils/objectStorage";
import { formatEmpId, getEmpIdSequence } from "../utils/employeeId";

const router = Router();
const EMP_ID_COUNTER_KEY = "empId";

const getParamId = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return value[0];
  if (typeof value === "string") return value;
  return undefined;
};

const reserveNextEmpId = async (): Promise<string> =>
  prisma.$transaction(async (tx) => {
    const existingUsers = await tx.user.findMany({ select: { empId: true } });
    const maxExistingSequence = existingUsers.reduce((maxValue, user) => {
      return Math.max(maxValue, getEmpIdSequence(user.empId));
    }, 0);

    const counter = await tx.counter.upsert({
      where: { key: EMP_ID_COUNTER_KEY },
      update: { seq: { increment: 1 } },
      create: { key: EMP_ID_COUNTER_KEY, seq: 1 },
    });

    const counterSequence = Math.max(1, Number(counter.seq || 1));
    const nextSequence = Math.max(counterSequence, maxExistingSequence + 1);

    if (nextSequence !== counterSequence) {
      await tx.counter.update({
        where: { key: EMP_ID_COUNTER_KEY },
        data: { seq: nextSequence },
      });
    }

    return formatEmpId(nextSequence);
  });

const getNextEmpIdPreview = async (): Promise<string> => {
  const [existingUsers, counter] = await Promise.all([
    prisma.user.findMany({ select: { empId: true } }),
    prisma.counter.findUnique({ where: { key: EMP_ID_COUNTER_KEY } }),
  ]);

  const maxExistingSequence = existingUsers.reduce((maxValue, user) => {
    return Math.max(maxValue, getEmpIdSequence(user.empId));
  }, 0);

  const counterSequence = Math.max(0, Number(counter?.seq || 0));
  return formatEmpId(Math.max(counterSequence, maxExistingSequence) + 1);
};

// All routes require authentication
router.use(authMiddleware);

// Get next employee ID preview (admin only)
router.get("/next-emp-id", adminMiddleware, async (_req, res) => {
  try {
    const empId = await getNextEmpIdPreview();
    res.json({ empId });
  } catch (error: any) {
    res.status(500).json({ message: "Error generating employee ID" });
  }
});

// Get all users
router.get("/", async (req, res) => {
  try {
    const { roles } = req.query;
    const isAdmin = String(req.user?.role || "").trim().toUpperCase() === "ADMIN";
    
    // Build query filter
    const query: any = {};
    
    // If roles query parameter is provided, filter by roles
    if (roles) {
      const roleArray = Array.isArray(roles)
        ? roles.map((role) => String(role).trim()).filter(Boolean)
        : String(roles)
            .split(",")
            .map((role) => role.trim())
            .filter(Boolean);
      if (roleArray.length > 0) {
        query.role = { in: roleArray };
      }
    }
    
    const users = await prisma.user.findMany({
      where: Object.keys(query).length ? query : undefined,
    });
    res.json(users.map((user) => mapUser(user, { includePassword: isAdmin })));
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Get single user
router.get("/:id", adminMiddleware, async (req, res) => {
  try {
    const id = getParamId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(mapUser(user, { includePassword: true }));
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching user" });
  }
});

// Create user
router.post("/", adminMiddleware, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, image, role, empId } = req.body;

    if (!password || !firstName || !lastName || !phone) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (normalizedEmail) {
      const existingUser = await prisma.user.findFirst({ where: { email: normalizedEmail } });
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const imageUrl = await resolveStoredFile(image, "users");

    const requestedEmpId = String(empId || "").trim().toUpperCase();
    if (requestedEmpId) {
      const existingEmpIdUser = await prisma.user.findFirst({
        where: { empId: requestedEmpId },
        select: { id: true },
      });
      if (existingEmpIdUser) {
        return res.status(400).json({ message: "Employee ID already exists" });
      }
    }

    let user = null as any;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const generatedEmpId = requestedEmpId || await reserveNextEmpId();
      let emailToUse = normalizedEmail || `${generatedEmpId.toLowerCase()}@uniqueprecision.local`;
      if (!normalizedEmail) {
        let suffix = 1;
        while (await prisma.user.findFirst({ where: { email: emailToUse }, select: { id: true } })) {
          suffix += 1;
          emailToUse = `${generatedEmpId.toLowerCase()}+${suffix}@uniqueprecision.local`;
        }
      }

      try {
        user = await prisma.user.create({
          data: {
            email: emailToUse,
            passwordHash: hashedPassword,
            passwordText: String(password),
            firstName,
            lastName,
            phone,
            empId: generatedEmpId,
            image: imageUrl || "",
            role: role || "OPERATOR",
          },
        });
        break;
      } catch (createError: any) {
        if (createError?.code === "P2002") {
          const target = String(createError?.meta?.target || "");
          if (!requestedEmpId && target.includes("empId")) continue;
        }
        throw createError;
      }
    }

    if (!user) {
      return res.status(500).json({ message: "Failed to allocate employee ID" });
    }

    res.status(201).json(mapUser(user, { includePassword: true }));
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "User with this email already exists" });
    }
    res.status(500).json({ message: "Error creating user" });
  }
});

// Update user
router.put("/:id", adminMiddleware, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, image, role, empId } = req.body;

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (image !== undefined) {
      updateData.image = await resolveStoredFile(image, "users");
    }
    if (role) updateData.role = role;
    if (String(email || "").trim()) updateData.email = String(email).trim().toLowerCase();
    if (String(empId || "").trim()) {
      updateData.empId = String(empId).trim().toUpperCase();
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
      updateData.passwordText = String(password);
    }

    const id = getParamId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (updateData.empId) {
      const conflictingUser = await prisma.user.findFirst({
        where: {
          empId: updateData.empId,
          NOT: { id },
        },
        select: { id: true },
      });
      if (conflictingUser) {
        return res.status(400).json({ message: "Employee ID already exists" });
      }
    }
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    
    res.json(mapUser(user, { includePassword: true }));
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    if (error.code === "P2002") {
      const target = String(error?.meta?.target || "");
      return res.status(400).json({
        message: target.includes("empId") ? "Employee ID already exists" : "User with this email already exists",
      });
    }
    res.status(500).json({ message: "Error updating user" });
  }
});

// Delete user
router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        return res.status(400).json({ message: "Invalid user id" });
      }
      const user = await prisma.user.delete({ where: { id } });
      return res.json({ message: "User deleted successfully" });
    } catch (deleteError: any) {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting user" });
  }
});

export default router;
