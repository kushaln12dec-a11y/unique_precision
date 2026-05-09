import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { HttpError } from "../lib/httpError";

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { empId, email, identifier, password } = req.body ?? {};
    const loginIdentifier = String(empId ?? identifier ?? email ?? "").trim();

    if (!loginIdentifier || !password) {
      throw new HttpError(400, "Employee ID and password are required");
    }

    const result = await authService.loginUser(loginIdentifier, String(password));
    res.json(result);
  } catch (error) {
    next(error);
  }
};
