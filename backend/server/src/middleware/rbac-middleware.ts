import { Request, Response, NextFunction } from "express";
import { HttpError } from "../lib/httpError";

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return next(new HttpError(401, "Unauthorized"));
    }

    if (!allowedRoles.includes(userRole)) {
      return next(new HttpError(403, "Forbidden"));
    }

    next();
  };
};
