import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { HttpError } from "../lib/httpError";

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      throw new HttpError(400, "Email/Employee ID and password are required");
    }

    const result = await authService.loginUser(String(email), String(password));
    res.json(result);
  } catch (error) {
    next(error);
  }
};
