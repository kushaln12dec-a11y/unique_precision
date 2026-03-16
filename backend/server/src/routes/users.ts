import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { mapUser } from "../utils/prismaMappers";
import { resolveStoredFile } from "../utils/objectStorage";

const router = Router();

const getParamId = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return value[0];
  if (typeof value === "string") return value;
  return undefined;
};

// All routes require authentication
router.use(authMiddleware);

// Get all users
router.get("/", async (req, res) => {
  try {
    const { roles } = req.query;
    
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
    res.json(users.map(mapUser));
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
    res.json(mapUser(user));
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching user" });
  }
});

// Create user
router.post("/", adminMiddleware, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, empId, image, role } = req.body;

    if (!email || !password || !firstName || !lastName || !phone || !empId) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { empId }],
      },
    });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email or Emp ID already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const imageUrl = await resolveStoredFile(image, "users");
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        phone,
        empId,
        image: imageUrl || "",
        role: role || "OPERATOR",
      },
    });

    res.status(201).json(mapUser(user));
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "User with this email or Emp ID already exists" });
    }
    res.status(500).json({ message: "Error creating user" });
  }
});

// Update user
router.put("/:id", adminMiddleware, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, empId, image, role } = req.body;

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (empId) updateData.empId = empId;
    if (image !== undefined) {
      updateData.image = await resolveStoredFile(image, "users");
    }
    if (role) updateData.role = role;
    if (email) updateData.email = email;

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const id = getParamId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    
    res.json(mapUser(user));
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    if (error.code === "P2002") {
      return res.status(400).json({ message: "User with this email or Emp ID already exists" });
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
