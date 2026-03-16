import dotenv from "dotenv";
import { prisma } from "../lib/prisma";

dotenv.config();

const updateUserRole = async () => {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not defined in environment variables");
    }

    const email = "kushaln12dec@gmail.com";

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log("User not found with email:", email);
      return;
    }

    // Update user with required fields if they don't exist
    const updateData: any = { role: "ADMIN" };
    
    if (!user.firstName) updateData.firstName = "Admin";
    if (!user.lastName) updateData.lastName = "User";
    if (!user.phone) updateData.phone = "";
    if (!user.empId) updateData.empId = "EMP001";

    await prisma.user.update({ where: { id: user.id }, data: updateData });
    console.log("User updated successfully!");
    console.log("Email:", email);
    console.log("Role: ADMIN");
    await prisma.$disconnect();
  } catch (error: any) {
    console.error("Error updating user:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

updateUserRole();
