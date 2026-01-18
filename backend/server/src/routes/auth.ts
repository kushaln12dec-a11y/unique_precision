import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User";

const router = Router();


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if JWT_SECRET is defined
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role || "OPERATOR" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { id: user._id, email: user.email, role: user.role || "OPERATOR" } });
  } catch (error: any) {
    res.status(500).json({ message: "Error during login" });
  }
});

export default router;
