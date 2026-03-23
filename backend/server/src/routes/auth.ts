import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const router = Router();


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email/Employee ID and password are required" });
    }

    // Check if JWT_SECRET is defined
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    const identifier = String(email).trim();
    const identifierLower = identifier.toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { empId: identifier },
          ...(identifierLower === "admin" ? [{ role: "ADMIN" }] : []),
        ],
      },
    });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || null;
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role || "OPERATOR",
        empId: user.empId || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        fullName: fullName
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role || "OPERATOR",
        empId: user.empId || null,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: fullName
      } 
    });
  } catch (error: any) {
    console.error("Login failed:", error);
    res.status(500).json({ message: "Error during login" });
  }
});

export default router;
