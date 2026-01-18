import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";

dotenv.config();

const updateUserRole = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    await mongoose.connect(mongoUri);

    const email = "kushaln12dec@gmail.com";
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found with email:", email);
      await mongoose.disconnect();
      return;
    }

    // Update user with required fields if they don't exist
    const updateData: any = { role: "ADMIN" };
    
    if (!user.firstName) updateData.firstName = "Admin";
    if (!user.lastName) updateData.lastName = "User";
    if (!user.phone) updateData.phone = "";
    if (!user.empId) updateData.empId = "EMP001";

    await User.findByIdAndUpdate(user._id, updateData);
    console.log("User updated successfully!");
    console.log("Email:", email);
    console.log("Role: ADMIN");

    await mongoose.disconnect();
  } catch (error: any) {
    console.error("Error updating user:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

updateUserRole();
