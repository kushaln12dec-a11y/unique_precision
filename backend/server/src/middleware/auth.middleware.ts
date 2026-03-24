import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "../lib/httpError";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  empId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return next(new HttpError(401, "Unauthorized"));
  }

  if (!process.env.JWT_SECRET) {
    return next(new HttpError(500, "JWT_SECRET is not configured"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch {
    next(new HttpError(401, "Invalid token"));
  }
};
