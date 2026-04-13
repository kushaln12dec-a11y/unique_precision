import type { User } from "../../../types/user";
import { getDisplayName } from "../../../utils/jobFormatting";

const normalizeRole = (value: unknown) => String(value || "").trim().toUpperCase();

export const isOperatorUser = (user: Pick<User, "role">) => normalizeRole(user.role) === "OPERATOR";

export const toOperatorOption = (user: Pick<User, "_id" | "firstName" | "lastName" | "email">) => ({
  id: user._id,
  name: getDisplayName(user.firstName, user.lastName, user.email, String(user._id)).toUpperCase(),
});

export const getOperatorUsers = (users: User[]) => users.filter(isOperatorUser);

export const getOperatorOptions = (users: User[]) => getOperatorUsers(users).map(toOperatorOption);
