import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.sendStatus(403);
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Access denied. Admin role required." });
  }
  next();
};
