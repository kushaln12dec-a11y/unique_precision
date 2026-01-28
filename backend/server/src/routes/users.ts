import { Router } from "express";
import bcrypt from "bcrypt";
import User from "../models/User";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = Router();

// All routes require authentication and admin access
router.use(authMiddleware);
router.use(adminMiddleware);

// Get all users
router.get("/", async (req, res) => {
  try {
    const { roles } = req.query;
    
    // Build query filter
    const query: any = {};
    
    // If roles query parameter is provided, filter by roles
    if (roles) {
      const roleArray = Array.isArray(roles) ? roles : roles.toString().split(",");
      query.role = { $in: roleArray };
    }
    
    const users = await User.find(query).select("-password");
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Get single user
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching user" });
  }
});

// Create user
router.post("/", async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, empId, image, role } = req.body;

    if (!email || !password || !firstName || !lastName || !phone || !empId) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { empId }] });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email or Emp ID already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      empId,
      image: image || "",
      role: role || "OPERATOR"
    });

    const userObj = user.toObject() as Record<string, any>;
    const { password: _, ...userResponse } = userObj;

    res.status(201).json(userResponse as Omit<typeof userObj, "password">);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "User with this email or Emp ID already exists" });
    }
    res.status(500).json({ message: "Error creating user" });
  }
});

// Update user
router.put("/:id", async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, empId, image, role } = req.body;

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (empId) updateData.empId = empId;
    if (image !== undefined) updateData.image = image;
    if (role) updateData.role = role;
    if (email) updateData.email = email;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "User with this email or Emp ID already exists" });
    }
    res.status(500).json({ message: "Error updating user" });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting user" });
  }
});

export default router;
