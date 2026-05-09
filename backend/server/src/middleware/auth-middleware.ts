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
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return next(new HttpError(401, "Unauthorized"));
  }

  try {
    const decoded = verifyAuthToken(token);
    req.user = decoded;
    next();
  } catch {
    next(new HttpError(401, "Invalid token"));
  }
};

const getBearerToken = (authorization?: string) => authorization?.split(" ")[1];

export const verifyAuthToken = (token: string): AuthenticatedUser => {
  if (!process.env.JWT_SECRET) {
    throw new HttpError(500, "JWT_SECRET is not configured");
  }

  return jwt.verify(token, process.env.JWT_SECRET) as AuthenticatedUser;
};

export const authenticateEventStream = (req: Request, _res: Response, next: NextFunction) => {
  const queryToken = typeof req.query.token === "string" ? req.query.token.trim() : "";
  const token = getBearerToken(req.headers.authorization) || queryToken;

  if (!token) {
    return next(new HttpError(401, "Unauthorized"));
  }

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    next(new HttpError(401, "Invalid token"));
  }
};
