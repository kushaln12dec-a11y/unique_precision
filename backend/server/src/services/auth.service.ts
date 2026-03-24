import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/httpError";

export const loginUser = async (emailOrEmpId: string, password: string) => {
  if (!process.env.JWT_SECRET) {
    throw new HttpError(500, "Server configuration error");
  }

  const identifier = String(emailOrEmpId).trim();
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

  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new HttpError(401, "Invalid credentials");
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || null;

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role || "OPERATOR",
      empId: user.empId || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      fullName,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role || "OPERATOR",
      empId: user.empId || null,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName,
    },
  };
};
