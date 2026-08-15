import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/httpError";
import { getEmpIdCandidates, normalizeEmpId } from "../utils/employeeId";

export const loginUser = async (emailOrEmpId: string, password: string) => {
  if (!process.env.JWT_SECRET) {
    throw new HttpError(500, "Server configuration error");
  }

  const identifier = String(emailOrEmpId).trim();
  const identifierLower = identifier.toLowerCase();
  const empIdCandidates = getEmpIdCandidates(identifier);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { email: identifierLower },
        ...empIdCandidates.map((empId) => ({ empId })),
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
      empId: normalizeEmpId(user.empId) || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      fullName,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d", algorithm: "HS256" }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role || "OPERATOR",
      empId: normalizeEmpId(user.empId) || null,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName,
    },
  };
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  if (!userId) throw new HttpError(401, "Unauthorized");
  if (!currentPassword || !newPassword) {
    throw new HttpError(400, "Current password and new password are required");
  }
  if (String(newPassword).length < 6) {
    throw new HttpError(400, "New password must be at least 6 characters");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, "User not found");

  const matches = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!matches) throw new HttpError(401, "Current password is incorrect");

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, passwordText: null },
  });

  return { message: "Password updated successfully" };
};
